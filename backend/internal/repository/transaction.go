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
		Where("target_id = ? AND amount = ? AND status = ? AND expired_at > ?", targetID, amount, "PENDING", time.Now()).
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
		Where("target_id = ? AND status = ?", userID, "PAID").
		Scan(&stats).Error
	return stats.TotalAmount, stats.TotalDonors, err
}

func (r *TransactionRepository) GetRecent(userID uint, limit int) ([]domain.Transaction, error) {
	var recent []domain.Transaction
	err := r.db.Where("target_id = ? AND status = ?", userID, "PAID").
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
		Where("target_id = ? AND status = ?", userID, "PAID").
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

func (r *TransactionRepository) GetOverlayList(userID uint, config domain.ListOverlayConfig) ([]domain.OverlayListItem, error) {
	var items []domain.OverlayListItem
	db := r.db.Model(&domain.Transaction{}).Where("target_id = ? AND status = ?", userID, "PAID")

	if config.StartsAt != nil {
		db = db.Where("created_at >= ?", *config.StartsAt)
	}
	if config.EndsAt != nil {
		db = db.Where("created_at <= ?", *config.EndsAt)
	}

	if config.AggrType == "supporter" {
		// Aggregate by supporter identity (donor_user_id or supporter_id)
		// We use COALESCE to group by either user id or the unique supporter id string
		// and pick the LATEST sender name for display
		query := db.Select("MAX(sender) as sender, SUM(base_amount) as amount").
			Group("COALESCE(CAST(donor_user_id AS TEXT), NULLIF(supporter_id, ''))")

		if config.SortBy == "amount_desc" {
			query = query.Order("amount DESC")
		} else {
			// for "recent" with aggregation, we sort by the latest donation in the group
			query = query.Order("MAX(created_at) DESC")
		}

		err := query.Limit(config.Limit).Scan(&items).Error
		return items, err
	}

	// Default: aggregation by transaction (each row is separate)
	query := db.Select("sender, base_amount as amount")

	if config.SortBy == "amount_desc" {
		query = query.Order("base_amount DESC")
	} else {
		query = query.Order("created_at DESC")
	}

	err := query.Limit(config.Limit).Scan(&items).Error
	return items, err
}

func (r *TransactionRepository) GetAnalyticsSummary(userID uint, start, end time.Time) (domain.AnalyticsSummary, error) {
	var summary domain.AnalyticsSummary
	err := r.db.Model(&domain.Transaction{}).
		Select("COALESCE(SUM(base_amount), 0) as total_nominal, COUNT(*) as total_count, COALESCE(CAST(ROUND(AVG(base_amount)) AS BIGINT), 0) as average_value").
		Where("target_id = ? AND status = ? AND created_at BETWEEN ? AND ?", userID, "PAID", start, end).
		Scan(&summary).Error
	if err != nil {
		return summary, err
	}

	// Unique supporters: prefer donor_user_id, fallback supporter_id
	err = r.db.Model(&domain.Transaction{}).
		Select("COUNT(DISTINCT COALESCE(CAST(donor_user_id AS TEXT), NULLIF(supporter_id, ''))) AS total_supporters").
		Where("target_id = ? AND status = ? AND created_at BETWEEN ? AND ?", userID, "PAID", start, end).
		Scan(&summary.TotalSupporters).Error
	if err != nil {
		return summary, err
	}
	return summary, err
}


func (r *TransactionRepository) GetAnalyticsTransactions(userID uint, start, end time.Time, search string, page, limit int) ([]domain.Transaction, int64, error) {
	var transactions []domain.Transaction
	var total int64

	db := r.db.Model(&domain.Transaction{}).
		Where("target_id = ? AND status = ? AND created_at BETWEEN ? AND ?", userID, "PAID", start, end)

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
