package handler

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/ikhsan/ongob/backend/internal/domain"
	"github.com/ikhsan/ongob/backend/internal/service"
	"gorm.io/gorm"
)

type TransactionHandler struct {
	db                *gorm.DB
	qrisService       *service.QRISService
	authService       *service.AuthService
	hub               *domain.Hub
	queueManager      *domain.AlertQueueManager
	defaultStaticQRIS string
	webhookSecret     string
}

func NewTransactionHandler(db *gorm.DB, qrisService *service.QRISService, authService *service.AuthService, hub *domain.Hub, queueManager *domain.AlertQueueManager, cfg domain.Config) *TransactionHandler {
	return &TransactionHandler{
		db:                db,
		qrisService:       qrisService,
		authService:       authService,
		hub:               hub,
		queueManager:      queueManager,
		defaultStaticQRIS: cfg.DefaultStaticQRIS,
		webhookSecret:     cfg.WebhookSecret,
	}
}

func (h *TransactionHandler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	var target domain.User
	if err := h.db.Where("username = ?", req.Username).First(&target).Error; err != nil {
		http.Error(w, "recipient not found", http.StatusNotFound)
		return
	}

	// Minimal donation validation
	if target.MinDonation > 0 && int64(req.Amount) < target.MinDonation {
		http.Error(w, "nominal donasi di bawah batas minimal", http.StatusBadRequest)
		return
	}

	// Custom input validation - jika user mewajibkan custom input, harus diisi
	if target.CustomInputRequired && target.CustomInputLabel != "" && req.CustomInput == "" {
		http.Error(w, target.CustomInputLabel+" wajib diisi", http.StatusBadRequest)
		return
	}

	// Unique ID mechanism (10-99)
	uniqueCode := rand.Intn(90) + 10
	totalAmount := req.Amount + uniqueCode

	// Use user's own StaticQRIS or fallback to default
	qrisBase := target.StaticQRIS
	if qrisBase == "" {
		qrisBase = h.defaultStaticQRIS
	}

	if qrisBase == "" {
		http.Error(w, "penerima belum menyetel QRIS", http.StatusBadRequest)
		return
	}

	// Generate Dynamic QRIS with total amount
	qrisPayload, err := h.qrisService.GenerateDynamicQRIS(qrisBase, totalAmount)
	if err != nil {
		http.Error(w, "failed to generate QRIS", http.StatusInternalServerError)
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
		IsQueue:     true, // Default: masuk antrian
		ExpiredAt:   time.Now().Add(3 * time.Minute),
	}

	if err := h.db.Create(&tx).Error; err != nil {
		http.Error(w, "failed to create transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tx)
}

func (h *TransactionHandler) ProcessNotification(w http.ResponseWriter, r *http.Request) {
	// Identify user by X-App-Token or X-Webhook-Secret
	appToken := r.Header.Get("X-App-Token")
	webhookSecret := r.Header.Get("X-Webhook-Secret")

	var targetUser domain.User
	useAppToken := false

	if appToken != "" {
		if err := h.db.Where("app_token = ?", appToken).First(&targetUser).Error; err == nil {
			useAppToken = true
		} else {
			http.Error(w, "invalid app token", http.StatusUnauthorized)
			return
		}
	} else if webhookSecret != "" && webhookSecret == h.webhookSecret {
		// Legacy/Global mode - targetUser remains empty/nil
	} else {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Title   string `json:"title"`
		Message string `json:"message"`
		Amount  int    `json:"amount"`
		Bank    string `json:"bank"`
		Source  string `json:"source"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
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
	query := h.db.Preload("Target").
		Where("amount = ? AND status = ? AND expired_at > ?", req.Amount, "pending", time.Now())

	// If using AppToken, filter by that specific user to prevent collisions
	if useAppToken {
		query = query.Where("target_id = ?", targetUser.ID)
	}

	err := query.First(&tx).Error

	if err == nil {
		// 3. Update status to paid
		h.db.Model(&tx).Update("status", "paid")

		// Broadcast immediate paid status to all connected clients (especially the donor page)
		h.hub.Broadcast <- domain.AlertMessage{
			UserUUID:        tx.Target.UUID,
			TransactionUUID: tx.UUID,
			Type:            "paid",
		}

		// 4. Enqueue alert (this goes into the FIFO queue for the streamer's overlay)
		h.queueManager.Enqueue(domain.AlertMessage{
			UserUUID:        tx.Target.UUID,
			TransactionUUID: tx.UUID,
			Type:            "alert",
			Amount:          tx.BaseAmount, // Show base amount in alert
			Sender:          tx.Sender,
			Message:         tx.Note,
		})
	}

	w.WriteHeader(http.StatusOK)
}

func (h *TransactionHandler) GetTransaction(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "uuid")

	var tx domain.Transaction
	if err := h.db.Preload("Target").Where("uuid = ?", id).First(&tx).Error; err != nil {
		http.Error(w, "transaction not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tx)
}

func (h *TransactionHandler) WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	userUUID := chi.URLParam(r, "uuid")

	// Validate user exists
	var user domain.User
	if err := h.db.Where("uuid = ?", userUUID).First(&user).Error; err != nil {
		http.Error(w, "invalid channel", http.StatusNotFound)
		return
	}

	// Proceed with WebSocket upgrade
	domain.ServeWs(h.hub, h.queueManager, w, r, userUUID)
}

func (h *TransactionHandler) TestAlert(w http.ResponseWriter, r *http.Request) {
	userUUID := chi.URLParam(r, "uuid")

	// Verify ownership - user can only test alert on their own UUID
	userID := r.Context().Value("user_id").(uint)
	var user domain.User
	if err := h.db.Where("id = ? AND uuid = ?", userID, userUUID).First(&user).Error; err != nil {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	// Enqueue test alert (will be sent one-by-one via queue)
	h.queueManager.Enqueue(domain.AlertMessage{
		UserUUID: userUUID,
		Type:     "alert",
		Amount:   50000,
		Sender:   "Tester Ganteng",
		Message:  "Ini adalah pesan uji coba dari dashboard!",
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
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	// 1. Total Amount & Total Donors (paid only)
	var stats struct {
		TotalAmount int64 `json:"total_amount"`
		TotalDonors int64 `json:"total_donors"`
	}
	h.db.Model(&domain.Transaction{}).
		Select("SUM(base_amount) as total_amount, COUNT(DISTINCT sender) as total_donors").
		Where("target_id = ? AND status = ?", user.ID, "paid").
		Scan(&stats)

	// 2. Recent Donations
	var recent []domain.Transaction
	h.db.Where("target_id = ? AND status = ?", user.ID, "paid").
		Order("created_at DESC").
		Limit(10).
		Find(&recent)

	// 3. Top Supporters (All time, Day, Week, Month)
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
	json.NewEncoder(w).Encode(map[string]interface{}{
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	var tx domain.Transaction
	if err := h.db.Preload("Target").Where("uuid = ?", txUUID).First(&tx).Error; err != nil {
		http.Error(w, "transaction not found", http.StatusNotFound)
		return
	}

	// Verify ownership - user can only update their own transactions
	if tx.Target.ID != userID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.db.Model(&tx).Update("is_queue", req.IsQueue).Error; err != nil {
		http.Error(w, "failed to update queue status", http.StatusInternalServerError)
		return
	}

	// Broadcast refresh to WS
	h.hub.Broadcast <- domain.AlertMessage{
		UserUUID: tx.Target.UUID,
		Type:     "refresh",
	}

	tx.IsQueue = req.IsQueue
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tx)
}

// AddToQueue adds a transaction to the queue
func (h *TransactionHandler) AddToQueue(w http.ResponseWriter, r *http.Request) {
	txUUID := chi.URLParam(r, "uuid")
	userID := r.Context().Value("user_id").(uint)

	var tx domain.Transaction
	if err := h.db.Preload("Target").Where("uuid = ?", txUUID).First(&tx).Error; err != nil {
		http.Error(w, "transaction not found", http.StatusNotFound)
		return
	}

	// Verify ownership
	if tx.Target.ID != userID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.db.Model(&tx).Update("is_queue", true).Error; err != nil {
		http.Error(w, "failed to add to queue", http.StatusInternalServerError)
		return
	}

	// Broadcast refresh to WS
	h.hub.Broadcast <- domain.AlertMessage{
		UserUUID: tx.Target.UUID,
		Type:     "refresh",
	}

	tx.IsQueue = true
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tx)
}

// RemoveFromQueue removes a transaction from the queue
func (h *TransactionHandler) RemoveFromQueue(w http.ResponseWriter, r *http.Request) {
	txUUID := chi.URLParam(r, "uuid")
	userID := r.Context().Value("user_id").(uint)

	var tx domain.Transaction
	if err := h.db.Preload("Target").Where("uuid = ?", txUUID).First(&tx).Error; err != nil {
		http.Error(w, "transaction not found", http.StatusNotFound)
		return
	}

	// Verify ownership
	if tx.Target.ID != userID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.db.Model(&tx).Update("is_queue", false).Error; err != nil {
		http.Error(w, "failed to remove from queue", http.StatusInternalServerError)
		return
	}

	// Broadcast refresh to WS
	h.hub.Broadcast <- domain.AlertMessage{
		UserUUID: tx.Target.UUID,
		Type:     "refresh",
	}

	tx.IsQueue = false
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tx)
}

// GetQueueList returns transactions list sorted by amount
func (h *TransactionHandler) GetQueueList(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")

	var user domain.User
	if err := h.db.Where("username = ?", username).First(&user).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
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
		http.Error(w, "failed to fetch transactions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transactions)
}
