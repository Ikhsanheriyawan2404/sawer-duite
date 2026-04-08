package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/service"
)

type ClientLogHandler struct {
	authService *service.AuthService
	logService  *service.ClientLogService
}

func NewClientLogHandler(authService *service.AuthService, logService *service.ClientLogService) *ClientLogHandler {
	return &ClientLogHandler{
		authService: authService,
		logService:  logService,
	}
}

type clientLogRequest struct {
	ID      string          `json:"id"`
	TS      int64           `json:"ts"`
	Level   string          `json:"level"`
	Event   string          `json:"event"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
	Device  json.RawMessage `json:"device"`
	Error   string          `json:"error"`
}

func (h *ClientLogHandler) Create(w http.ResponseWriter, r *http.Request) {
	appToken := r.Header.Get("X-App-Token")
	if appToken == "" {
		JSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	targetUser, err := h.authService.GetUserByAppToken(appToken)
	if err != nil {
		JSONError(w, "invalid app token", http.StatusUnauthorized)
		return
	}

	var req []clientLogRequest
	if !BindJSON(w, r, &req) {
		return
	}

	logs := make([]domain.ClientLog, 0, len(req))
	for _, item := range req {
		createdAt := time.Now()
		if item.TS > 0 {
			createdAt = time.UnixMilli(item.TS)
		}

		logs = append(logs, domain.ClientLog{
			UserID:    targetUser.ID,
			Event:     item.Event,
			Level:     item.Level,
			Message:   item.Message,
			Data:      string(item.Data),
			Device:    string(item.Device),
			Error:     item.Error,
			CreatedAt: createdAt,
		})
	}

	if err := h.logService.CreateBatch(logs); err != nil {
		JSONError(w, "failed to save logs", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
