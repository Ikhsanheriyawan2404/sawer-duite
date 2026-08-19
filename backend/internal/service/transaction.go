package service

import (
	"bytes"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/repository"
	"github.com/google/uuid"
)

type TransactionService struct {
	txRepo        *repository.TransactionRepository
	userRepo      *repository.UserRepository
	notifRepo     *repository.NotificationRepository
	qrisService   *QRISService
	ttsService    *TTSService
	filterService *FilterService
	hub           *domain.Hub
	queueManager  *domain.AlertQueueManager
	httpClient    *http.Client
}

func NewTransactionService(
	txRepo *repository.TransactionRepository,
	userRepo *repository.UserRepository,
	notifRepo *repository.NotificationRepository,
	qrisService *QRISService,
	ttsService *TTSService,
	filterService *FilterService,
	hub *domain.Hub,
	queueManager *domain.AlertQueueManager,
) *TransactionService {
	return &TransactionService{
		txRepo:        txRepo,
		userRepo:      userRepo,
		notifRepo:     notifRepo,
		qrisService:   qrisService,
		ttsService:    ttsService,
		filterService: filterService,
		hub:           hub,
		queueManager:  queueManager,
		httpClient:    &http.Client{Timeout: 5 * time.Second},
	}
}

func (s *TransactionService) CreateTransaction(req domain.CreateTransactionRequest, publicBaseURL string) (*domain.CreateTransactionResponse, error) {
	target, err := s.userRepo.GetByUsername(req.Username)
	if err != nil {
		return nil, errors.New("recipient not found")
	}

	supporterEmail, err := normalizeSupporterEmail(req.SupporterEmail)
	if err != nil {
		return nil, err
	}

	if target.Config.MinDonation > 0 && int64(req.Amount) < target.Config.MinDonation {
		return nil, errors.New("nominal donasi di bawah batas minimal")
	}

	// Validate custom inputs (schema-based)
	if len(target.Config.CustomInputSchema) > 0 {
		for _, field := range target.Config.CustomInputSchema {
			if field.Required {
				if req.CustomInputJSON == nil || req.CustomInputJSON[field.Key] == "" {
					if field.RequiredError != "" {
						return nil, errors.New(field.RequiredError)
					}
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
		UUID:            uuid.New().String(),
		TargetID:        target.ID,
		DonorUserID:     req.DonorUserID,
		SupporterID:     req.SupporterID,
		SupporterEmail:  &supporterEmail,
		Sender:          req.Sender,
		Amount:          totalAmount,
		BaseAmount:      req.Amount,
		Note:            req.Note,
		CustomInputJSON: req.CustomInputJSON,
		MediaURL:        req.MediaURL,
		QRISPayload:     qrisPayload,
		Status:          "PENDING",
		IsQueue:         true,
		ExpiredAt:       time.Now().Add(5 * time.Minute),
	}

	if err := s.txRepo.Create(&tx); err != nil {
		return nil, errors.New("failed to create transaction")
	}
	s.registerMutasiHubIntent(target, tx, publicBaseURL)

	return &domain.CreateTransactionResponse{
		UUID:        tx.UUID,
		Amount:      tx.Amount,
		BaseAmount:  tx.BaseAmount,
		QRISPayload: tx.QRISPayload,
		ExpiredAt:   tx.ExpiredAt,
	}, nil
}

func normalizeSupporterEmail(value string) (string, error) {
	email := strings.TrimSpace(value)
	if email == "" {
		return "", errors.New("email wajib diisi")
	}
	if len(email) > 254 {
		return "", errors.New("email maksimal 254 karakter")
	}
	parsed, err := mail.ParseAddress(email)
	if err != nil || !strings.EqualFold(parsed.Address, email) {
		return "", errors.New("format email tidak valid")
	}
	return strings.ToLower(parsed.Address), nil
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

	rows, err := s.txRepo.MarkPaidIfPending(tx.UUID, req.Amount)
	if err != nil {
		return err
	}
	if rows == 0 {
		return nil
	}

	logEntry.Processed = true
	logEntry.TransactionID = &tx.ID
	logEntry.TransactionUUID = tx.UUID
	_ = s.notifRepo.Update(&logEntry)

	s.dispatchPaidEffects(user, tx)

	return nil
}

type MutasiHubWebhookRequest struct {
	Event                 string `json:"event"`
	IntentID              int64  `json:"intent_id"`
	Platform              string `json:"platform"`
	ExternalID            string `json:"external_id"`
	MerchantID            string `json:"merchant_id"`
	Amount                int    `json:"amount"`
	PaidAt                string `json:"paid_at"`
	ProviderTransactionID string `json:"provider_transaction_id"`
}

func (s *TransactionService) ProcessMutasiHubWebhook(req MutasiHubWebhookRequest, bearerToken string) (bool, error) {
	if req.Event != "payment.paid" {
		return false, errors.New("unsupported event")
	}
	if req.Platform != "sawerblox" {
		return false, errors.New("invalid platform")
	}
	if strings.TrimSpace(req.ExternalID) == "" || req.Amount <= 0 {
		return false, errors.New("invalid webhook payload")
	}

	tx, err := s.txRepo.GetByUUID(req.ExternalID)
	if err != nil {
		return false, errors.New("transaction not found")
	}
	expectedAPIKey := strings.TrimSpace(tx.Target.Payment.MutasiHubAPIKey)
	if expectedAPIKey == "" || !constantTimeEqual(expectedAPIKey, strings.TrimSpace(bearerToken)) {
		return false, errors.New("unauthorized webhook")
	}
	if tx.Amount != req.Amount {
		return false, errors.New("amount mismatch")
	}
	if strings.TrimSpace(req.PaidAt) != "" {
		paidAt, err := time.Parse(time.RFC3339, req.PaidAt)
		if err != nil {
			return false, errors.New("invalid paid_at")
		}
		if paidAt.Before(tx.CreatedAt) || paidAt.After(tx.ExpiredAt) {
			return false, errors.New("paid_at outside transaction window")
		}
	}

	rows, err := s.txRepo.MarkPaidIfPending(tx.UUID, req.Amount)
	if err != nil {
		return false, err
	}
	if rows == 0 {
		return false, nil
	}

	s.dispatchPaidEffects(&tx.Target, tx)
	return true, nil
}

func (s *TransactionService) registerMutasiHubIntent(user *domain.User, tx domain.Transaction, publicBaseURL string) {
	mutasiHubURL := strings.TrimSpace(user.Payment.MutasiHubURL)
	apiKey := strings.TrimSpace(user.Payment.MutasiHubAPIKey)
	publicBaseURL = strings.TrimSpace(publicBaseURL)
	if mutasiHubURL == "" || apiKey == "" || publicBaseURL == "" {
		return
	}

	payload := map[string]any{
		"platform":    "sawerblox",
		"external_id": tx.UUID,
		"amount":      tx.Amount,
		"created_at":  tx.CreatedAt.Format(time.RFC3339),
		"expires_at":  tx.ExpiredAt.Format(time.RFC3339),
		"webhook_url": strings.TrimRight(publicBaseURL, "/") + "/internal/mutasi-hub/webhook",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[MutasiHub] Failed to encode payment intent for %s: %v", tx.UUID, err)
		return
	}

	endpoint, err := mutasiHubPaymentIntentURL(mutasiHubURL)
	if err != nil {
		log.Printf("[MutasiHub] Invalid URL for user %d: %v", user.ID, err)
		return
	}

	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		log.Printf("[MutasiHub] Invalid URL for user %d: %v", user.ID, err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		log.Printf("[MutasiHub] Failed to register payment intent %s: %v", tx.UUID, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("[MutasiHub] Register payment intent %s returned status %d", tx.UUID, resp.StatusCode)
	}
}

func mutasiHubPaymentIntentURL(rawURL string) (string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", errors.New("invalid mutasi hub URL")
	}
	if strings.Trim(parsed.Path, "/") == "" {
		parsed.Path = "/payment-intents"
	}
	return parsed.String(), nil
}

func constantTimeEqual(expected, actual string) bool {
	if expected == "" || actual == "" || len(expected) != len(actual) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(expected), []byte(actual)) == 1
}

func (s *TransactionService) dispatchPaidEffects(user *domain.User, tx *domain.Transaction) {
	_ = s.queueManager.PublishAlertMessage(domain.AlertMessage{
		UserUUID:        user.UUID,
		TransactionUUID: tx.UUID,
		Type:            "PAID",
	})

	filteredSender := s.filterService.Filter(tx.Sender)
	filteredNote := s.filterService.Filter(tx.Note)

	formatted := fmt.Sprintf("%d", tx.BaseAmount)
	ttsText := fmt.Sprintf("%s rupiah dari %s", formatted, filteredSender.TTSText)
	if filteredNote.TTSText != "" {
		ttsText += ". " + filteredNote.TTSText
	}
	audioURL, err := s.ttsService.Generate(ttsText)
	if err != nil {
		log.Printf("[Alert] TTS Generation Error: %v", err)
	}

	s.queueManager.Enqueue(domain.AlertMessage{
		UserUUID:        user.UUID,
		TransactionUUID: tx.UUID,
		Type:            "ALERT",
		Amount:          tx.BaseAmount,
		Sender:          filteredSender.CensoredText,
		Message:         filteredNote.CensoredText,
		AudioURL:        audioURL,
		MediaURL:        tx.MediaURL,
	})
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

func (s *TransactionService) ReplayAlert(userID uint, userUUID string, txUUID string) error {
	user, err := s.userRepo.GetByID(userID)
	if err != nil || user.UUID != userUUID {
		return errors.New("forbidden")
	}

	tx, err := s.txRepo.GetByUUID(txUUID)
	if err != nil {
		return errors.New("transaction not found")
	}

	if tx.TargetID != user.ID {
		return errors.New("forbidden")
	}

	filteredSender := s.filterService.Filter(tx.Sender)
	filteredNote := s.filterService.Filter(tx.Note)

	formatted := fmt.Sprintf("%d", tx.BaseAmount)
	ttsText := fmt.Sprintf("%s rupiah dari %s", formatted, filteredSender.TTSText)
	if filteredNote.TTSText != "" {
		ttsText += ". " + filteredNote.TTSText
	}
	audioURL, err := s.ttsService.Generate(ttsText)
	if err != nil {
		log.Printf("[Replay] TTS Generation Error: %v", err)
	}

	s.queueManager.Enqueue(domain.AlertMessage{
		UserUUID:        user.UUID,
		TransactionUUID: tx.UUID,
		Type:            "ALERT",
		Amount:          tx.BaseAmount,
		Sender:          filteredSender.CensoredText,
		Message:         filteredNote.CensoredText,
		AudioURL:        audioURL,
		MediaURL:        tx.MediaURL,
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
