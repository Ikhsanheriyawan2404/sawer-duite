package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/handler"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/middleware"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/repository"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/service"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/redis/go-redis/v9"
)

func main() {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		log.Fatalf("Failed to load timezone Asia/Jakarta: %v", err)
	}
	time.Local = loc

	cfg := domain.GetConfig()

	db := repository.InitDB(cfg)

	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.RedisURL,
	})

	hub := domain.NewHub()
	go hub.Run()

	queueManager := domain.NewAlertQueueManager(rdb)
	go hub.RunRedisSubscriber(context.Background(), rdb)
	go queueManager.RunTimeoutWorker(context.Background())

	userRepo := repository.NewUserRepository(db)
	txRepo := repository.NewTransactionRepository(db)
	notifRepo := repository.NewNotificationRepository(db)
	clientLogRepo := repository.NewClientLogRepository(db)
	ttsCacheRepo := repository.NewTTSCacheRepository(db)

	// 2. Services
	authService := service.NewAuthService(cfg, userRepo)
	qrisService := service.NewQRISService()
	ttsService := service.NewTTSService(ttsCacheRepo, rdb, cfg)
	txService := service.NewTransactionService(txRepo, userRepo, notifRepo, qrisService, ttsService, hub, queueManager)
	clientLogService := service.NewClientLogService(clientLogRepo)

	r := chi.NewRouter()

	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.CORS)
	r.Use(middleware.RateLimit(rdb, cfg))

	healthHandler := handler.NewHealthHandler()
	authHandler := handler.NewAuthHandler(authService)
	txHandler := handler.NewTransactionHandler(txService, authService, hub, queueManager)
	clientLogHandler := handler.NewClientLogHandler(authService, clientLogService)

	r.Get("/health", healthHandler.Check)

	// Auth Routes (Public)
	r.Post("/register", authHandler.Register)
	r.Post("/login", authHandler.Login)
	r.Post("/refresh", authHandler.Refresh)
	r.Get("/user/{username}", authHandler.GetUserByUsername)
	r.Get("/user/uuid/{uuid}", authHandler.GetUserByUUID)
	r.Get("/users", authHandler.ListPublicUsers)

	// Public Transaction Routes
	r.Post("/transactions", txHandler.CreateTransaction)
	r.Get("/transactions/{uuid}", txHandler.GetTransaction)
	r.Get("/user/{username}/stats", txHandler.GetUserStats)
	r.Get("/user/{username}/queue", txHandler.GetQueueList)

	// Webhook & Logs
	r.Post("/notifications", txHandler.ProcessNotification)
	r.Post("/client-logs", clientLogHandler.Create)

	// WebSocket
	r.Get("/ws/{uuid}", txHandler.WebSocketHandler)

	// Protected Routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(authService))

		r.Get("/me", authHandler.Me)
		r.Post("/me", authHandler.UpdateProfile)

		r.Post("/user/{uuid}/test-alert", txHandler.TestAlert)

		r.Patch("/transactions/{uuid}/queue", txHandler.UpdateQueue)
		r.Post("/transactions/{uuid}/queue/add", txHandler.AddToQueue)
		r.Post("/transactions/{uuid}/queue/remove", txHandler.RemoveFromQueue)
	})

	log.Println("Server starting on :3000")
	if err := http.ListenAndServe(":3000", r); err != nil {
		log.Fatal(err)
	}
}
