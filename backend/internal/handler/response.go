package handler

import (
	"encoding/json"
	"net/http"
)

type apiResponse struct {
	Status  int    `json:"status"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
}

func JSONError(w http.ResponseWriter, message string, status int) {
	writeJSON(w, status, apiResponse{Status: status, Message: message})
}

func JSONSuccess(w http.ResponseWriter, status int, data any) {
	if data == nil {
		writeJSON(w, status, apiResponse{Status: status})
		return
	}
	writeJSON(w, status, apiResponse{Status: status, Data: data})
}

// JSONResponse writes raw JSON without wrapping into apiResponse.
// Use when you need to preserve existing response shape.
func JSONResponse(w http.ResponseWriter, status int, data any) {
	writeJSON(w, status, data)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
