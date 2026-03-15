package handler

import (
	"encoding/json"
	"net/http"

	"github.com/ikhsan/ongob/backend/internal/domain"
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
