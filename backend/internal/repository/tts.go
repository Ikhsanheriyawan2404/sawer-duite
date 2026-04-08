package repository

import (
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"gorm.io/gorm"
)

type TTSCacheRepository struct {
	db *gorm.DB
}

func NewTTSCacheRepository(db *gorm.DB) *TTSCacheRepository {
	return &TTSCacheRepository{db: db}
}

func (r *TTSCacheRepository) GetByHash(hash string) (*domain.TTSCache, error) {
	var cache domain.TTSCache
	if err := r.db.Where("text_hash = ?", hash).First(&cache).Error; err != nil {
		return nil, err
	}
	return &cache, nil
}

func (r *TTSCacheRepository) Create(cache *domain.TTSCache) error {
	return r.db.Create(cache).Error
}
