package handler

import (
	"encoding/json"
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
	defaultStaticQRIS string
}

func NewTransactionHandler(db *gorm.DB, qrisService *service.QRISService, cfg domain.Config) *TransactionHandler {
	return &TransactionHandler{
		db:                db,
		qrisService:       qrisService,
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

	// Generate Dynamic QRIS
	qrisPayload, err := h.qrisService.GenerateDynamicQRIS(h.defaultStaticQRIS, req.Amount)
	if err != nil {
		http.Error(w, "failed to generate QRIS", http.StatusInternalServerError)
		return
	}

	tx := domain.Transaction{
		UUID:        uuid.New().String(),
		TargetID:    target.ID,
		Sender:      req.Sender,
		Amount:      req.Amount,
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
