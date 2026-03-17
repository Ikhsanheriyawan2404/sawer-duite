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
	hub               *domain.Hub
	defaultStaticQRIS string
}

func NewTransactionHandler(db *gorm.DB, qrisService *service.QRISService, hub *domain.Hub, cfg domain.Config) *TransactionHandler {
	return &TransactionHandler{
		db:                db,
		qrisService:       qrisService,
		hub:               hub,
		defaultStaticQRIS: cfg.DefaultStaticQRIS,
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

	// Unique ID mechanism (10-99)
	uniqueCode := rand.Intn(90) + 10
	totalAmount := req.Amount + uniqueCode

	// Generate Dynamic QRIS with total amount
	qrisPayload, err := h.qrisService.GenerateDynamicQRIS(h.defaultStaticQRIS, totalAmount)
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
		QRISPayload: qrisPayload,
		Status:      "pending",
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
	log := domain.NotificationLog{
		Message: req.Message,
		Amount:  int64(req.Amount),
		Bank:    req.Bank,
	}
	log.GenerateHash()
	if err := h.db.Create(&log).Error; err != nil {
		// Log error but continue if it's just a duplicate hash
	}

	// 2. Find matching transaction
	var tx domain.Transaction
	err := h.db.Preload("Target").
		Where("amount = ? AND status = ? AND expired_at > ?", req.Amount, "pending", time.Now()).
		First(&tx).Error

	if err == nil {
		// 3. Update status to paid
		h.db.Model(&tx).Update("status", "paid")

		// 4. Broadcast to WebSocket
		h.hub.Broadcast <- domain.AlertMessage{
			UserUUID: tx.Target.UUID,
			Amount:   tx.BaseAmount, // Show base amount in alert
			Sender:   tx.Sender,
			Message:  tx.Note,
		}
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
	domain.ServeWs(h.hub, w, r, userUUID)
}

func (h *TransactionHandler) TestAlert(w http.ResponseWriter, r *http.Request) {
	userUUID := chi.URLParam(r, "uuid")

	// Kirim pesan simulasi ke hub
	h.hub.Broadcast <- domain.AlertMessage{
		UserUUID: userUUID,
		Amount:   50000,
		Sender:   "Tester Ganteng",
		Message:  "Ini adalah pesan uji coba dari dashboard!",
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Test alert sent"))
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
