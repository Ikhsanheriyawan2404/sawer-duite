package handler

import (
    "encoding/json"
    "net/http"
    "time"

    "github.com/ikhsan/ongob/backend/internal/domain"
    "gorm.io/gorm"
)

type ClientLogHandler struct {
    db *gorm.DB
}

func NewClientLogHandler(db *gorm.DB) *ClientLogHandler {
    return &ClientLogHandler{db: db}
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
    // Identify user by X-App-Token
    appToken := r.Header.Get("X-App-Token")

    var targetUser domain.User

    if appToken != "" {
        if err := h.db.Where("app_token = ?", appToken).First(&targetUser).Error; err != nil {
            http.Error(w, "invalid app token", http.StatusUnauthorized)
            return
        }
    } else {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }

    var req []clientLogRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid request", http.StatusBadRequest)
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

    if len(logs) == 0 {
        w.WriteHeader(http.StatusNoContent)
        return
    }

    if err := h.db.Create(&logs).Error; err != nil {
        http.Error(w, "failed to save logs", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
}
