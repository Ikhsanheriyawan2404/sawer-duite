package domain

import (
	"time"

	"gorm.io/gorm"
)

type Transaction struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	UUID         string         `gorm:"uniqueIndex;not null" json:"uuid"`
	TargetID     uint           `gorm:"not null" json:"target_id"`
	Target       User           `gorm:"foreignKey:TargetID" json:"-"`
	Sender       string         `json:"sender"`
	Amount       int            `json:"amount"`      // Total to pay (e.g., 50089)
	BaseAmount   int            `json:"base_amount"` // Original amount (e.g., 50000)
	Note         string         `json:"note"`
	QRISPayload  string         `json:"qris_payload"`
	Status       string         `gorm:"default:'pending'" json:"status"` // pending, paid, expired
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	ExpiredAt    time.Time      `json:"expired_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type CreateTransactionRequest struct {
	Username string `json:"username"` // target username
	Sender   string `json:"sender"`
	Amount   int    `json:"amount"` // Base amount
	Note     string `json:"note"`
}

type CreateTransactionResponse struct {
	UUID        string    `json:"uuid"`
	Amount      int       `json:"amount"`      // Total with unique code
	BaseAmount  int       `json:"base_amount"` // Original
	QRISPayload string    `json:"qris_payload"`
	ExpiredAt   time.Time `json:"expired_at"`
}
