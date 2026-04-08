package repository

import (
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"gorm.io/gorm"
)

type ClientLogRepository struct {
	db *gorm.DB
}

func NewClientLogRepository(db *gorm.DB) *ClientLogRepository {
	return &ClientLogRepository{db: db}
}

func (r *ClientLogRepository) CreateBatch(logs []domain.ClientLog) error {
	return r.db.Create(&logs).Error
}
