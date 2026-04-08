package service

import (
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/repository"
)

type ClientLogService struct {
	logRepo *repository.ClientLogRepository
}

func NewClientLogService(logRepo *repository.ClientLogRepository) *ClientLogService {
	return &ClientLogService{logRepo: logRepo}
}

func (s *ClientLogService) CreateBatch(logs []domain.ClientLog) error {
	if len(logs) == 0 {
		return nil
	}
	return s.logRepo.CreateBatch(logs)
}
