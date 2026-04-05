package handler

import (
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

func (h *HealthHandler) Check(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	response := domain.HealthResponse{Status: "ok"}
	json.NewEncoder(w).Encode(response)
}

func (h *HealthHandler) CheckPost(w http.ResponseWriter, r *http.Request) {
  body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
  log.Println("REQUEST BODY:", string(body))
	w.Header().Set("Content-Type", "application/json")
	response := domain.HealthResponse{Status: "ok"}
	json.NewEncoder(w).Encode(response)
}
