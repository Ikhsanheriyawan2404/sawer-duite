package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/service"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TransactionHandler struct {
	db                *gorm.DB
	qrisService       *service.QRISService
	authService       *service.AuthService
	ttsService        *service.TTSService
	hub               *domain.Hub
	queueManager      *domain.AlertQueueManager
}

func NewTransactionHandler(db *gorm.DB, qrisService *service.QRISService, authService *service.AuthService, ttsService *service.TTSService, hub *domain.Hub, queueManager *domain.AlertQueueManager) *TransactionHandler {
	return &TransactionHandler{
		db:                db,
		qrisService:       qrisService,
		authService:       authService,
		ttsService:        ttsService,
		hub:               hub,
		queueManager:      queueManager,
	}
}

func (h *TransactionHandler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateTransactionRequest
	if !BindJSON(w, r, &req) {
		return
	}
	req.CustomInput = strings.TrimSpace(req.CustomInput)

	var target domain.User
	if err := h.db.Where("username = ?", req.Username).First(&target).Error; err != nil {
		JSONError(w, "recipient not found", http.StatusNotFound)
		return
	}

	if target.MinDonation > 0 && int64(req.Amount) < target.MinDonation {
		JSONError(w, "nominal donasi di bawah batas minimal", http.StatusBadRequest)
		return
	}

	if target.CustomInputRequired && target.CustomInputLabel != "" && req.CustomInput == "" {
		JSONError(w, target.CustomInputLabel+" wajib diisi", http.StatusBadRequest)
		return
	}

	// Unique ID mechanism (10-99)
	uniqueCode := rand.Intn(90) + 10
	totalAmount := req.Amount + uniqueCode

	qrisBase := target.StaticQRIS

	if qrisBase == "" {
		JSONError(w, "penerima belum menyetel QRIS", http.StatusBadRequest)
		return
	}

	qrisPayload, err := h.qrisService.GenerateDynamicQRIS(qrisBase, totalAmount)
	if err != nil {
		JSONError(w, "failed to generate QRIS", http.StatusInternalServerError)
		return
	}

	tx := domain.Transaction{
		UUID:        uuid.New().String(),
		TargetID:    target.ID,
		Sender:      req.Sender,
		Amount:      totalAmount,
		BaseAmount:  req.Amount,
		Note:        req.Note,
		CustomInput: req.CustomInput,
		QRISPayload: qrisPayload,
		Status:      "pending",
		IsQueue:     true,
		ExpiredAt:   time.Now().Add(5 * time.Minute),
	}

	if err := h.db.Create(&tx).Error; err != nil {
		JSONError(w, "failed to create transaction", http.StatusInternalServerError)
		return
	}

	JSONResponse(w, http.StatusOK, domain.CreateTransactionResponse{
		UUID:        tx.UUID,
		Amount:      tx.Amount,
		BaseAmount:  tx.BaseAmount,
		QRISPayload: tx.QRISPayload,
		ExpiredAt:   tx.ExpiredAt,
	})
}

func (h *TransactionHandler) ProcessNotification(w http.ResponseWriter, r *http.Request) {
	// Identify user by X-App-Token
	appToken := r.Header.Get("X-App-Token")

	var targetUser domain.User

	if appToken != "" {
		if err := h.db.Where("app_token = ?", appToken).First(&targetUser).Error; err != nil {
			JSONError(w, "invalid app token", http.StatusUnauthorized)
			return
		}
	} else {
		JSONError(w, "unauthorized", http.StatusUnauthorized)
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

	// 1. Log notification
	logEntry := domain.NotificationLog{
		Message: req.Message,
		Amount:  int64(req.Amount),
		Bank:    req.Bank,
	}
	logEntry.GenerateHash()
	if err := h.db.Create(&logEntry).Error; err != nil {
		// Log error but continue if it's just a duplicate hash
	}

	// 2. Find matching transaction
	var tx domain.Transaction
	err := h.db.Preload("Target").
		Where("target_id = ? AND amount = ? AND status = ? AND expired_at > ?", targetUser.ID, req.Amount, "pending", time.Now()).
		First(&tx).Error

	if err == nil {
		// 3. Update status to paid
		h.db.Model(&tx).Update("status", "paid")

		// Broadcast immediate paid status to all connected clients (especially the donor page)
		h.hub.Broadcast <- domain.AlertMessage{
			UserUUID:        tx.Target.UUID,
			TransactionUUID: tx.UUID,
			Type:            "paid",
		}

		// Generate TTS audio
		formatted := fmt.Sprintf("%d", tx.BaseAmount)
		ttsText := fmt.Sprintf("%s rupiah dari %s", formatted, tx.Sender)
		if tx.Note != "" {
			ttsText += ". " + tx.Note
		}
		audioURL, err := h.ttsService.Generate(ttsText)
		if err != nil {
			log.Printf("[Alert] TTS Generation Error: %v", err)
		} else {
			log.Printf("[Alert] TTS Generated URL: %s", audioURL)
		}

		// 4. Enqueue alert (this goes into the FIFO queue for the streamer's overlay)
		h.queueManager.Enqueue(domain.AlertMessage{
			UserUUID:        tx.Target.UUID,
			TransactionUUID: tx.UUID,
			Type:            "alert",
			Amount:          tx.BaseAmount, // Show base amount in alert
			Sender:          tx.Sender,
			Message:         tx.Note,
			AudioURL:        audioURL,
		})
	}

	w.WriteHeader(http.StatusOK)
}

func (h *TransactionHandler) GetTransaction(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "uuid")

	var tx domain.Transaction
	if err := h.db.Preload("Target").Where("uuid = ?", id).First(&tx).Error; err != nil {
		JSONError(w, "transaction not found", http.StatusNotFound)
		return
	}

	JSONResponse(w, http.StatusOK, domain.ToPublicTransaction(tx))
}

func (h *TransactionHandler) WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	userUUID := chi.URLParam(r, "uuid")

	var user domain.User
	if err := h.db.Where("uuid = ?", userUUID).First(&user).Error; err != nil {
		JSONError(w, "invalid channel", http.StatusNotFound)
		return
	}

	// Proceed with WebSocket upgrade
	domain.ServeWs(h.hub, h.queueManager, w, r, userUUID)
}

func (h *TransactionHandler) TestAlert(w http.ResponseWriter, r *http.Request) {
	userUUID := chi.URLParam(r, "uuid")

	userID := r.Context().Value("user_id").(uint)
	var user domain.User
	if err := h.db.Where("id = ? AND uuid = ?", userID, userUUID).First(&user).Error; err != nil {
		JSONError(w, "forbidden", http.StatusForbidden)
		return
	}

	// Enqueue test alert (will be sent one-by-one via queue)
	testText := "50000 rupiah dari Tester Ganteng. Ini adalah pesan uji coba dari dashboard!"
	audioURL, _ := h.ttsService.Generate(testText)

	h.queueManager.Enqueue(domain.AlertMessage{
		UserUUID: userUUID,
		Type:     "alert",
		Amount:   50000,
		Sender:   "Tester Ganteng",
		Message:  "Ini adalah pesan uji coba dari dashboard!",
		AudioURL: audioURL,
	})

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Test alert queued"))
}

type Supporter struct {
	Sender string `json:"sender"`
	Amount int    `json:"amount"`
}

func (h *TransactionHandler) GetUserStats(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")

	var user domain.User
	if err := h.db.Where("username = ?", username).First(&user).Error; err != nil {
		JSONError(w, "user not found", http.StatusNotFound)
		return
	}

	var stats struct {
		TotalAmount int64 `json:"total_amount"`
		TotalDonors int64 `json:"total_donors"`
	}
	h.db.Model(&domain.Transaction{}).
		Select("SUM(base_amount) as total_amount, COUNT(DISTINCT sender) as total_donors").
		Where("target_id = ? AND status = ?", user.ID, "paid").
		Scan(&stats)

	var recent []domain.Transaction
	h.db.Where("target_id = ? AND status = ?", user.ID, "paid").
		Order("created_at DESC").
		Limit(10).
		Find(&recent)

	topSupporters := make(map[string][]Supporter)

	periods := map[string]time.Time{
		"all":   {},
		"day":   time.Now().AddDate(0, 0, -1),
		"week":  time.Now().AddDate(0, 0, -7),
		"month": time.Now().AddDate(0, -1, 0),
	}

	for key, startTime := range periods {
		var supporters []Supporter
		query := h.db.Model(&domain.Transaction{}).
			Select("sender, SUM(base_amount) as amount").
			Where("target_id = ? AND status = ?", user.ID, "paid").
			Group("sender").
			Order("amount DESC").
			Limit(5)

		if !startTime.IsZero() {
			query = query.Where("created_at >= ?", startTime)
		}

		query.Scan(&supporters)
		topSupporters[key] = supporters
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"total_amount":   stats.TotalAmount,
		"total_donors":   stats.TotalDonors,
		"recent":         recent,
		"top_supporters": topSupporters,
	})
}

// UpdateQueue updates the queue status of a transaction
func (h *TransactionHandler) UpdateQueue(w http.ResponseWriter, r *http.Request) {
	txUUID := chi.URLParam(r, "uuid")
	userID := r.Context().Value("user_id").(uint)

	var req domain.UpdateQueueRequest
	if !BindJSON(w, r, &req) {
		return
	}

	var tx domain.Transaction
	if err := h.db.Preload("Target").Where("uuid = ?", txUUID).First(&tx).Error; err != nil {
		JSONError(w, "transaction not found", http.StatusNotFound)
		return
	}

	if tx.Target.ID != userID {
		JSONError(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.db.Model(&tx).Update("is_queue", req.IsQueue).Error; err != nil {
		JSONError(w, "failed to update queue status", http.StatusInternalServerError)
		return
	}

	// Broadcast refresh to WS
	h.hub.Broadcast <- domain.AlertMessage{
		UserUUID: tx.Target.UUID,
		Type:     "refresh",
	}

	tx.IsQueue = req.IsQueue
	JSONResponse(w, http.StatusOK, domain.ToPublicTransaction(tx))
}

// AddToQueue adds a transaction to the queue
func (h *TransactionHandler) AddToQueue(w http.ResponseWriter, r *http.Request) {
	txUUID := chi.URLParam(r, "uuid")
	userID := r.Context().Value("user_id").(uint)

	var tx domain.Transaction
	if err := h.db.Preload("Target").Where("uuid = ?", txUUID).First(&tx).Error; err != nil {
		JSONError(w, "transaction not found", http.StatusNotFound)
		return
	}

	if tx.Target.ID != userID {
		JSONError(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.db.Model(&tx).Update("is_queue", true).Error; err != nil {
		JSONError(w, "failed to add to queue", http.StatusInternalServerError)
		return
	}

	// Broadcast refresh to WS
	h.hub.Broadcast <- domain.AlertMessage{
		UserUUID: tx.Target.UUID,
		Type:     "refresh",
	}

	tx.IsQueue = true
	JSONResponse(w, http.StatusOK, domain.ToPublicTransaction(tx))
}

// RemoveFromQueue removes a transaction from the queue
func (h *TransactionHandler) RemoveFromQueue(w http.ResponseWriter, r *http.Request) {
	txUUID := chi.URLParam(r, "uuid")
	userID := r.Context().Value("user_id").(uint)

	var tx domain.Transaction
	if err := h.db.Preload("Target").Where("uuid = ?", txUUID).First(&tx).Error; err != nil {
		JSONError(w, "transaction not found", http.StatusNotFound)
		return
	}

	if tx.Target.ID != userID {
		JSONError(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.db.Model(&tx).Update("is_queue", false).Error; err != nil {
		JSONError(w, "failed to remove from queue", http.StatusInternalServerError)
		return
	}

	// Broadcast refresh to WS
	h.hub.Broadcast <- domain.AlertMessage{
		UserUUID: tx.Target.UUID,
		Type:     "refresh",
	}

	tx.IsQueue = false
	JSONResponse(w, http.StatusOK, domain.ToPublicTransaction(tx))
}

// GetQueueList returns transactions list sorted by amount
func (h *TransactionHandler) GetQueueList(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")

	var user domain.User
	if err := h.db.Where("username = ?", username).First(&user).Error; err != nil {
		JSONError(w, "user not found", http.StatusNotFound)
		return
	}

	// Parse query parameters
	status := r.URL.Query().Get("status")
	isQueueStr := r.URL.Query().Get("is_queue")
	sortBy := r.URL.Query().Get("sort_by")
	order := r.URL.Query().Get("order")

	// Defaults
	if sortBy == "" {
		sortBy = "base_amount"
	}
	if order == "" {
		order = "desc"
	}

	// Build query
	query := h.db.Model(&domain.Transaction{}).Where("target_id = ?", user.ID)

	// Filter by status
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter by is_queue
	if isQueueStr != "" {
		isQueue := isQueueStr == "true"
		query = query.Where("is_queue = ?", isQueue)
	}

	// Validate sort column
	allowedSortBy := map[string]bool{"base_amount": true, "amount": true, "created_at": true}
	if !allowedSortBy[sortBy] {
		sortBy = "base_amount"
	}

	// Validate order
	if order != "asc" && order != "desc" {
		order = "desc"
	}

	// Apply sorting
	query = query.Order(sortBy + " " + order)

	var transactions []domain.Transaction
	if err := query.Find(&transactions).Error; err != nil {
		JSONError(w, "failed to fetch transactions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transactions)
}
