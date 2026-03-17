package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/ikhsan/ongob/backend/internal/domain"
	"github.com/ikhsan/ongob/backend/internal/handler"
	"github.com/ikhsan/ongob/backend/internal/middleware"
	"github.com/ikhsan/ongob/backend/internal/repository"
	"github.com/ikhsan/ongob/backend/internal/service"
	"github.com/redis/go-redis/v9"
)

func main() {
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

	authService := service.NewAuthService(cfg)
	qrisService := service.NewQRISService()

	r := chi.NewRouter()

	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.CORS)
	r.Use(middleware.RateLimit(rdb, cfg))

	healthHandler := handler.NewHealthHandler()
	authHandler := handler.NewAuthHandler(db, authService)
	txHandler := handler.NewTransactionHandler(db, qrisService, hub, cfg)

	r.Get("/health", healthHandler.Check)

	// Auth Routes
	r.Post("/login", authHandler.Login)
	r.Get("/user/{username}", authHandler.GetUserByUsername)

	// Transaction & WebSocket Routes
	r.Post("/transactions", txHandler.CreateTransaction)
	r.Get("/transactions/{uuid}", txHandler.GetTransaction)
	r.Get("/user/{username}/stats", txHandler.GetUserStats)
	r.Post("/notifications", txHandler.ProcessNotification) // From Android
	r.Get("/ws/{uuid}", txHandler.WebSocketHandler)         // For Overlay
	r.Post("/user/{uuid}/test-alert", txHandler.TestAlert)  // For Testing from Dashboard

	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(authService))
		r.Get("/me", authHandler.Me)
		r.Post("/me", authHandler.UpdateProfile)
	})

	log.Println("Server starting on :3000")
	if err := http.ListenAndServe(":3000", r); err != nil {
		log.Fatal(err)
	}
}
