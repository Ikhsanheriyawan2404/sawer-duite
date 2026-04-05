package main

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/handler"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/middleware"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/repository"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/service"
	"github.com/redis/go-redis/v9"
)

func main() {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		log.Fatalf("Failed to load timezone Asia/Jakarta: %v", err)
	}
	time.Local = loc

	cfg := domain.GetConfig()

	// DB Init
	db := repository.InitDB(cfg)

	// Redis Init
	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.RedisURL,
	})

	// Hub Init for WebSockets
	hub := domain.NewHub()
	go hub.Run()

	// Alert Queue Manager
	queueManager := domain.NewAlertQueueManager(hub)

	authService := service.NewAuthService(cfg)
	qrisService := service.NewQRISService()
	ttsService := service.NewTTSService(db, rdb, cfg)

	r := chi.NewRouter()

	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.CORS)
	r.Use(middleware.RateLimit(rdb, cfg))

	healthHandler := handler.NewHealthHandler()
	authHandler := handler.NewAuthHandler(db, authService)
	txHandler := handler.NewTransactionHandler(db, qrisService, authService, ttsService, hub, queueManager, cfg)
	clientLogHandler := handler.NewClientLogHandler(db)

	r.Get("/health", healthHandler.Check)

	// Auth Routes (Public)
	r.Post("/login", authHandler.Login)
	r.Post("/refresh", authHandler.Refresh)
	r.Get("/user/{username}", authHandler.GetUserByUsername)
	r.Get("/user/uuid/{uuid}", authHandler.GetUserByUUID)
	r.Get("/users", authHandler.ListPublicUsers)

	// Public Transaction Routes (untuk donor, tidak perlu login)
	r.Post("/transactions", txHandler.CreateTransaction)
	r.Get("/transactions/{uuid}", txHandler.GetTransaction)
	r.Get("/user/{username}/stats", txHandler.GetUserStats) // Public stats untuk landing page
	r.Get("/user/{username}/queue", txHandler.GetQueueList) // Public queue untuk overlay

	// Webhook dari Android (protected by secret header)
	r.Post("/notifications", txHandler.ProcessNotification)
	r.Post("/client-logs", clientLogHandler.Create)

	// WebSocket (protected by JWT query param - handled in handler)
	r.Get("/ws/{uuid}", txHandler.WebSocketHandler)

	// Protected Routes (memerlukan JWT)
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(authService))

		// User profile
		r.Get("/me", authHandler.Me)
		r.Post("/me", authHandler.UpdateProfile)

		// Test alert (hanya owner yang bisa test)
		r.Post("/user/{uuid}/test-alert", txHandler.TestAlert)

		// Queue Management (hanya owner yang bisa manage)
		r.Patch("/transactions/{uuid}/queue", txHandler.UpdateQueue)
		r.Post("/transactions/{uuid}/queue/add", txHandler.AddToQueue)
		r.Post("/transactions/{uuid}/queue/remove", txHandler.RemoveFromQueue)
	})

	log.Println("Server starting on :3000")
	if err := http.ListenAndServe(":3000", r); err != nil {
		log.Fatal(err)
	}
}
