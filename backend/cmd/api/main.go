package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/ikhsan/ongob/backend/internal/handler"
	"github.com/ikhsan/ongob/backend/internal/middleware"
)

func main() {
	r := chi.NewRouter()

	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.CORS)

	healthHandler := handler.NewHealthHandler()

	r.Get("/health", healthHandler.Check)

	log.Println("Server starting on :3000")
	if err := http.ListenAndServe(":3000", r); err != nil {
		log.Fatal(err)
	}
}
