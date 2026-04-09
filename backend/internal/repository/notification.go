package repository

import (
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) Create(log *domain.NotificationLog) error {
	return r.db.Create(log).Error
}

func (r *NotificationRepository) Update(log *domain.NotificationLog) error {
	return r.db.Save(log).Error
}
