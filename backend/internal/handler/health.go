package handler

import (
	"encoding/json"
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
