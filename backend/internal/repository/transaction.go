package repository

import (
	"time"

	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"gorm.io/gorm"
)

type TransactionRepository struct {
	db *gorm.DB
}

func NewTransactionRepository(db *gorm.DB) *TransactionRepository {
	return &TransactionRepository{db: db}
}

func (r *TransactionRepository) Create(tx *domain.Transaction) error {
	return r.db.Create(tx).Error
}

func (r *TransactionRepository) Update(tx *domain.Transaction) error {
	return r.db.Save(tx).Error
}

func (r *TransactionRepository) UpdateStatus(uuid string, status string) error {
	return r.db.Model(&domain.Transaction{}).Where("uuid = ?", uuid).Update("status", status).Error
}

func (r *TransactionRepository) UpdateQueueStatus(uuid string, isQueue bool) error {
	return r.db.Model(&domain.Transaction{}).Where("uuid = ?", uuid).Update("is_queue", isQueue).Error
}

func (r *TransactionRepository) GetByUUID(uuid string) (*domain.Transaction, error) {
	var tx domain.Transaction
	if err := r.db.Preload("Target").Where("uuid = ?", uuid).First(&tx).Error; err != nil {
		return nil, err
	}
	return &tx, nil
}

func (r *TransactionRepository) GetPendingByAmount(targetID uint, amount int) (*domain.Transaction, error) {
	var tx domain.Transaction
	err := r.db.Preload("Target").
		Where("target_id = ? AND amount = ? AND status = ? AND expired_at > ?", targetID, amount, "pending", time.Now()).
		First(&tx).Error
	if err != nil {
		return nil, err
	}
	return &tx, nil
}

func (r *TransactionRepository) GetUserStats(userID uint) (int64, int64, error) {
	var stats struct {
		TotalAmount int64 `json:"total_amount"`
		TotalDonors int64 `json:"total_donors"`
	}
	err := r.db.Model(&domain.Transaction{}).
		Select("SUM(base_amount) as total_amount, COUNT(DISTINCT sender) as total_donors").
		Where("target_id = ? AND status = ?", userID, "paid").
		Scan(&stats).Error
	return stats.TotalAmount, stats.TotalDonors, err
}

func (r *TransactionRepository) GetRecent(userID uint, limit int) ([]domain.Transaction, error) {
	var recent []domain.Transaction
	err := r.db.Where("target_id = ? AND status = ?", userID, "paid").
		Order("created_at DESC").
		Limit(limit).
		Find(&recent).Error
	return recent, err
}

func (r *TransactionRepository) GetTopSupporters(userID uint, startTime time.Time, limit int) ([]struct {
	Sender string `json:"sender"`
	Amount int    `json:"amount"`
}, error) {
	var supporters []struct {
		Sender string `json:"sender"`
		Amount int    `json:"amount"`
	}
	query := r.db.Model(&domain.Transaction{}).
		Select("sender, SUM(base_amount) as amount").
		Where("target_id = ? AND status = ?", userID, "paid").
		Group("sender").
		Order("amount DESC").
		Limit(limit)

	if !startTime.IsZero() {
		query = query.Where("created_at >= ?", startTime)
	}

	err := query.Scan(&supporters).Error
	return supporters, err
}

func (r *TransactionRepository) List(query domain.QueueListQuery, userID uint) ([]domain.Transaction, error) {
	db := r.db.Model(&domain.Transaction{}).Where("target_id = ?", userID)

	if query.Status != "" {
		db = db.Where("status = ?", query.Status)
	}

	if query.IsQueue != nil {
		db = db.Where("is_queue = ?", *query.IsQueue)
	}

	sortBy := query.SortBy
	if sortBy == "" {
		sortBy = "base_amount"
	}
	order := query.Order
	if order == "" {
		order = "desc"
	}

	db = db.Order(sortBy + " " + order)

	var transactions []domain.Transaction
	err := db.Find(&transactions).Error
	return transactions, err
}

func (r *TransactionRepository) GetAnalyticsSummary(userID uint, start, end time.Time) (domain.AnalyticsSummary, error) {
	var summary domain.AnalyticsSummary
	err := r.db.Model(&domain.Transaction{}).
		Select("COALESCE(SUM(base_amount), 0) as total_nominal, COUNT(*) as total_count, COALESCE(CAST(ROUND(AVG(base_amount)) AS BIGINT), 0) as average_value").
		Where("target_id = ? AND status = ? AND created_at BETWEEN ? AND ?", userID, "paid", start, end).
		Scan(&summary).Error

	// Temporarily hardcode supporters as requested
	summary.TotalSupporters = 100
	return summary, err
}


func (r *TransactionRepository) GetAnalyticsTransactions(userID uint, start, end time.Time, search string, page, limit int) ([]domain.Transaction, int64, error) {
	var transactions []domain.Transaction
	var total int64

	db := r.db.Model(&domain.Transaction{}).
		Where("target_id = ? AND status = ? AND created_at BETWEEN ? AND ?", userID, "paid", start, end)

	if search != "" {
		searchTerm := "%" + search + "%"
		db = db.Where("(sender ILIKE ? OR note ILIKE ? OR CAST(base_amount AS TEXT) LIKE ?)", searchTerm, searchTerm, searchTerm)
	}

	db.Count(&total)

	offset := (page - 1) * limit
	err := db.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&transactions).Error

	return transactions, total, err
}
