package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type TransactionHandler struct {
	txService    *service.TransactionService
	authService  *service.AuthService
	hub          *domain.Hub
	queueManager *domain.AlertQueueManager
}

func NewTransactionHandler(
	txService *service.TransactionService,
	authService *service.AuthService,
	hub *domain.Hub,
	queueManager *domain.AlertQueueManager,
) *TransactionHandler {
	return &TransactionHandler{
		txService:    txService,
		authService:  authService,
		hub:          hub,
		queueManager: queueManager,
	}
}

func (h *TransactionHandler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateTransactionRequest
	if !BindJSON(w, r, &req) {
		return
	}

	resp, err := h.txService.CreateTransaction(req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "recipient not found" {
			status = http.StatusNotFound
		} else if err.Error() == "nominal donasi di bawah batas minimal" ||
			err.Error() == "penerima belum menyetel QRIS" ||
			err.Error() == "link media tidak valid" ||
			err.Error() == "hanya link YouTube, TikTok, atau Instagram yang diizinkan" ||
			(err.Error() != "" && err.Error()[len(err.Error())-12:] == " wajib diisi") {
			status = http.StatusBadRequest
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusOK, resp)
}

func (h *TransactionHandler) ProcessNotification(w http.ResponseWriter, r *http.Request) {
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

	var req struct {
		Title   string `json:"title"`
		Message string `json:"message"`
		Amount  int    `json:"amount"`
		Bank    string `json:"bank"`
		Source  string `json:"source"`
	}

	if !BindJSON(w, r, &req) {
		return
	}

	if err := h.txService.ProcessNotification(targetUser, req); err != nil {
		JSONError(w, "failed to process notification", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *TransactionHandler) GetTransaction(w http.ResponseWriter, r *http.Request) {
	uuid := chi.URLParam(r, "uuid")

	tx, err := h.txService.GetTransaction(uuid)
	if err != nil {
		JSONError(w, "transaction not found", http.StatusNotFound)
		return
	}

	JSONResponse(w, http.StatusOK, domain.ToPublicTransaction(*tx))
}

func (h *TransactionHandler) WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	userUUID := chi.URLParam(r, "uuid")

	_, err := h.authService.GetUserByUUID(userUUID)
	if err != nil {
		JSONError(w, "invalid channel", http.StatusNotFound)
		return
	}

	domain.ServeWs(h.hub, h.queueManager, w, r, userUUID)
}

func (h *TransactionHandler) TestAlert(w http.ResponseWriter, r *http.Request) {
	userUUID := chi.URLParam(r, "uuid")
	userID := r.Context().Value("user_id").(uint)

	if err := h.txService.TestAlert(userID, userUUID); err != nil {
		JSONError(w, err.Error(), http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Test alert queued"))
}

func (h *TransactionHandler) GetUserStats(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")

	stats, err := h.txService.GetUserStats(username)
	if err != nil {
		JSONError(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (h *TransactionHandler) UpdateQueue(w http.ResponseWriter, r *http.Request) {
	txUUID := chi.URLParam(r, "uuid")
	userID := r.Context().Value("user_id").(uint)

	var req domain.UpdateQueueRequest
	if !BindJSON(w, r, &req) {
		return
	}

	tx, err := h.txService.UpdateQueue(userID, txUUID, req.IsQueue)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "transaction not found" {
			status = http.StatusNotFound
		} else if err.Error() == "forbidden" {
			status = http.StatusForbidden
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusOK, domain.ToPublicTransaction(*tx))
}

func (h *TransactionHandler) AddToQueue(w http.ResponseWriter, r *http.Request) {
	txUUID := chi.URLParam(r, "uuid")
	userID := r.Context().Value("user_id").(uint)

	tx, err := h.txService.UpdateQueue(userID, txUUID, true)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "transaction not found" {
			status = http.StatusNotFound
		} else if err.Error() == "forbidden" {
			status = http.StatusForbidden
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusOK, domain.ToPublicTransaction(*tx))
}

func (h *TransactionHandler) RemoveFromQueue(w http.ResponseWriter, r *http.Request) {
	txUUID := chi.URLParam(r, "uuid")
	userID := r.Context().Value("user_id").(uint)

	tx, err := h.txService.UpdateQueue(userID, txUUID, false)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "transaction not found" {
			status = http.StatusNotFound
		} else if err.Error() == "forbidden" {
			status = http.StatusForbidden
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusOK, domain.ToPublicTransaction(*tx))
}

func (h *TransactionHandler) GetQueueList(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")

	query := domain.QueueListQuery{
		Status:  r.URL.Query().Get("status"),
		SortBy:  r.URL.Query().Get("sort_by"),
		Order:   r.URL.Query().Get("order"),
	}

	isQueueStr := r.URL.Query().Get("is_queue")
	if isQueueStr != "" {
		isQueue := isQueueStr == "true"
		query.IsQueue = &isQueue
	}

	transactions, err := h.txService.GetQueueList(username, query)
	if err != nil {
		JSONError(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transactions)
}

func (h *TransactionHandler) GetAnalytics(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	startStr := r.URL.Query().Get("start_date")
	endStr := r.URL.Query().Get("end_date")
	search := r.URL.Query().Get("search")
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	if pageStr != "" {
		fmt.Sscanf(pageStr, "%d", &page)
	}
	limit := 10
	if limitStr != "" {
		fmt.Sscanf(limitStr, "%d", &limit)
	}

	start := time.Now().AddDate(0, -1, 0) // Default to last 30 days
	if startStr != "" {
		if t, err := time.Parse("2006-01-02", startStr); err == nil {
			start = t
		}
	}
	end := time.Now()
	if endStr != "" {
		if t, err := time.Parse("2006-01-02", endStr); err == nil {
			// Set to end of day
			end = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		}
	}

	resp, err := h.txService.GetAnalytics(userID, start, end, search, page, limit)
	if err != nil {
		JSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	JSONResponse(w, http.StatusOK, resp)
}
