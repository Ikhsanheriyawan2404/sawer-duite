package service

import (
	"errors"
	"fmt"
	"log"
	"math/rand"
	"net/url"
	"strings"
	"time"

	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/repository"
	"github.com/google/uuid"
)

type TransactionService struct {
	txRepo       *repository.TransactionRepository
	userRepo     *repository.UserRepository
	notifRepo    *repository.NotificationRepository
	qrisService  *QRISService
	ttsService   *TTSService
	hub          *domain.Hub
	queueManager *domain.AlertQueueManager
}

func NewTransactionService(
	txRepo *repository.TransactionRepository,
	userRepo *repository.UserRepository,
	notifRepo *repository.NotificationRepository,
	qrisService *QRISService,
	ttsService *TTSService,
	hub *domain.Hub,
	queueManager *domain.AlertQueueManager,
) *TransactionService {
	return &TransactionService{
		txRepo:       txRepo,
		userRepo:     userRepo,
		notifRepo:    notifRepo,
		qrisService:  qrisService,
		ttsService:   ttsService,
		hub:          hub,
		queueManager: queueManager,
	}
}

func (s *TransactionService) CreateTransaction(req domain.CreateTransactionRequest) (*domain.CreateTransactionResponse, error) {
	target, err := s.userRepo.GetByUsername(req.Username)
	if err != nil {
		return nil, errors.New("recipient not found")
	}

	if target.Config.MinDonation > 0 && int64(req.Amount) < target.Config.MinDonation {
		return nil, errors.New("nominal donasi di bawah batas minimal")
	}

	// Validate custom inputs (schema-based)
	if len(target.Config.CustomInputSchema) > 0 {
		for _, field := range target.Config.CustomInputSchema {
			if field.Required {
				if req.CustomInputJSON == nil || req.CustomInputJSON[field.Key] == "" {
					label := field.Label
					if label == "" {
						label = field.Key
					}
					return nil, errors.New(label + " wajib diisi")
				}
			}
		}
	}

	uniqueCode := rand.Intn(90) + 10
	totalAmount := req.Amount + uniqueCode

	qrisBase := target.Payment.StaticQRIS
	if qrisBase == "" {
		return nil, errors.New("penerima belum menyetel QRIS")
	}

	qrisPayload, err := s.qrisService.GenerateDynamicQRIS(qrisBase, totalAmount)
	if err != nil {
		return nil, errors.New("failed to generate QRIS")
	}

	if req.MediaURL != "" {
		if err := validateMediaURL(req.MediaURL); err != nil {
			return nil, err
		}
	}
	if req.DonorUserID == nil && strings.TrimSpace(req.SupporterID) == "" {
		req.SupporterID = uuid.NewString()
	}

	tx := domain.Transaction{
		UUID:        uuid.New().String(),
		TargetID:    target.ID,
		DonorUserID: req.DonorUserID,
		SupporterID: req.SupporterID,
		Sender:      req.Sender,
		Amount:      totalAmount,
		BaseAmount:  req.Amount,
		Note:        req.Note,
		CustomInputJSON: req.CustomInputJSON,
		MediaURL:    req.MediaURL,
		QRISPayload: qrisPayload,
		Status:      "PENDING",
		IsQueue:     true,
		ExpiredAt:   time.Now().Add(5 * time.Minute),
	}

	if err := s.txRepo.Create(&tx); err != nil {
		return nil, errors.New("failed to create transaction")
	}

	return &domain.CreateTransactionResponse{
		UUID:        tx.UUID,
		Amount:      tx.Amount,
		BaseAmount:  tx.BaseAmount,
		QRISPayload: tx.QRISPayload,
		ExpiredAt:   tx.ExpiredAt,
	}, nil
}

func (s *TransactionService) ProcessNotification(user *domain.User, req struct {
	Title   string `json:"title"`
	Message string `json:"message"`
	Amount  int    `json:"amount"`
	Bank    string `json:"bank"`
	Source  string `json:"source"`
}) error {
	// 1. Log notification
	logEntry := domain.NotificationLog{
		UserID:  user.ID,
		Message: req.Message,
		Amount:  int64(req.Amount),
		Bank:    req.Bank,
		Source:  req.Source,
	}
	logEntry.GenerateHash()
	_ = s.notifRepo.Create(&logEntry)

	// 2. Find matching transaction
	tx, err := s.txRepo.GetPendingByAmount(user.ID, req.Amount)
	if err != nil {
		return nil // No matching transaction, but not an error to return to client
	}

	// 3. Update status to PAID
	_ = s.txRepo.UpdateStatus(tx.UUID, "PAID")

	logEntry.Processed = true
	logEntry.TransactionID = &tx.ID
	logEntry.TransactionUUID = tx.UUID
	_ = s.notifRepo.Update(&logEntry)

	// Broadcast immediate PAID status
	_ = s.queueManager.PublishAlertMessage(domain.AlertMessage{
		UserUUID:        user.UUID,
		TransactionUUID: tx.UUID,
		Type:            "PAID",
	})

	// Generate TTS audio
	formatted := fmt.Sprintf("%d", tx.BaseAmount)
	ttsText := fmt.Sprintf("%s rupiah dari %s", formatted, tx.Sender)
	if tx.Note != "" {
		ttsText += ". " + tx.Note
	}
	audioURL, err := s.ttsService.Generate(ttsText)
	if err != nil {
		log.Printf("[Alert] TTS Generation Error: %v", err)
	}

	// 4. Enqueue alert
	s.queueManager.Enqueue(domain.AlertMessage{
		UserUUID:        user.UUID,
		TransactionUUID: tx.UUID,
		Type:            "ALERT",
		Amount:          tx.BaseAmount,
		Sender:          tx.Sender,
		Message:         tx.Note,
		AudioURL:        audioURL,
		MediaURL:        tx.MediaURL,
	})

	return nil
}

func validateMediaURL(value string) error {
	parsed, err := url.Parse(value)
	if err != nil || parsed.Host == "" {
		return errors.New("link media tidak valid")
	}
	host := strings.ToLower(parsed.Host)
	if strings.Contains(host, "youtube.com") || strings.Contains(host, "youtu.be") || strings.Contains(host, "tiktok.com") || strings.Contains(host, "instagram.com") {
		return nil
	}
	return errors.New("hanya link YouTube, TikTok, atau Instagram yang diizinkan")
}

func (s *TransactionService) GetTransaction(uuid string) (*domain.Transaction, error) {
	return s.txRepo.GetByUUID(uuid)
}

func (s *TransactionService) TestAlert(userID uint, userUUID string) error {
	user, err := s.userRepo.GetByID(userID)
	if err != nil || user.UUID != userUUID {
		return errors.New("forbidden")
	}

	testText := "50000 rupiah dari Tester Ganteng. Ini adalah pesan uji coba dari dashboard!"
	audioURL, _ := s.ttsService.Generate(testText)

	s.queueManager.Enqueue(domain.AlertMessage{
		UserUUID: userUUID,
		Type:     "ALERT",
		Amount:   50000,
		Sender:   "Tester Ganteng",
		Message:  "Ini adalah pesan uji coba dari dashboard!",
		AudioURL: audioURL,
	})

	return nil
}

func (s *TransactionService) GetUserStats(username string) (map[string]any, error) {
	user, err := s.userRepo.GetByUsername(username)
	if err != nil {
		return nil, errors.New("user not found")
	}

	totalAmount, totalDonors, _ := s.txRepo.GetUserStats(user.ID)
	recent, _ := s.txRepo.GetRecent(user.ID, 10)

	publicRecent := make([]domain.PublicTransaction, len(recent))
	for i, tx := range recent {
		publicRecent[i] = domain.ToPublicTransaction(tx)
	}

	topSupporters := make(map[string]any)
	periods := map[string]time.Time{
		"all":   {},
		"day":   time.Now().AddDate(0, 0, -1),
		"week":  time.Now().AddDate(0, 0, -7),
		"month": time.Now().AddDate(0, -1, 0),
	}

	for key, startTime := range periods {
		supporters, _ := s.txRepo.GetTopSupporters(user.ID, startTime, 5)
		topSupporters[key] = supporters
	}

	return map[string]any{
		"total_amount":   totalAmount,
		"total_donors":   totalDonors,
		"recent":         publicRecent,
		"top_supporters": topSupporters,
	}, nil
}

func (s *TransactionService) UpdateQueue(userID uint, txUUID string, isQueue bool) (*domain.Transaction, error) {
	tx, err := s.txRepo.GetByUUID(txUUID)
	if err != nil {
		return nil, errors.New("transaction not found")
	}

	if tx.TargetID != userID {
		return nil, errors.New("forbidden")
	}

	if err := s.txRepo.UpdateQueueStatus(txUUID, isQueue); err != nil {
		return nil, errors.New("failed to update queue status")
	}

	s.queueManager.PublishAlertMessage(domain.AlertMessage{
		UserUUID: tx.Target.UUID,
		Type:     "REFRESH",
	})

	tx.IsQueue = isQueue
	return tx, nil
}

func (s *TransactionService) GetQueueList(username string, query domain.QueueListQuery) ([]domain.PublicTransaction, error) {
	user, err := s.userRepo.GetByUsername(username)
	if err != nil {
		return nil, errors.New("user not found")
	}

	transactions, err := s.txRepo.List(query, user.ID)
	if err != nil {
		return nil, err
	}

	publicTransactions := make([]domain.PublicTransaction, len(transactions))
	for i, tx := range transactions {
		publicTransactions[i] = domain.ToPublicTransaction(tx)
	}

	return publicTransactions, nil
}

func (s *TransactionService) GetOverlayList(userUUID string) ([]domain.OverlayListItem, error) {
	user, err := s.userRepo.GetByUUID(userUUID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	items, err := s.txRepo.GetOverlayList(user.ID, user.ListConfig)
	if err != nil {
		return nil, err
	}

	return items, nil
}

func (s *TransactionService) GetAnalytics(userID uint, start, end time.Time, search string, page, limit int) (*domain.AnalyticsResponse, error) {
	summary, err := s.txRepo.GetAnalyticsSummary(userID, start, end)
	if err != nil {
		return nil, err
	}

	transactions, total, err := s.txRepo.GetAnalyticsTransactions(userID, start, end, search, page, limit)
	if err != nil {
		return nil, err
	}

	publicTransactions := make([]domain.PublicTransaction, len(transactions))
	for i, tx := range transactions {
		publicTransactions[i] = domain.ToPublicTransaction(tx)
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	resp := &domain.AnalyticsResponse{
		Summary:      summary,
		Transactions: publicTransactions,
	}
	resp.Pagination.CurrentPage = page
	resp.Pagination.TotalPages = totalPages
	resp.Pagination.HasNext = page < totalPages
	resp.Pagination.HasPrev = page > 1

	return resp, nil
}
