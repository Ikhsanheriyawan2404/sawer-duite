package domain

import (
	"crypto/sha256"
	"encoding/hex"
	"time"
)

type NotificationLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	Message   string    `gorm:"type:text;not null" json:"message"`
	Hash      string    `gorm:"type:varchar(64);uniqueIndex;not null" json:"hash"`
	Amount    int64     `json:"amount,omitempty"`
	Bank      string    `gorm:"type:varchar(50)" json:"bank,omitempty"`
	Source    string    `gorm:"type:varchar(50)" json:"source,omitempty"`
	TransactionID   *uint  `gorm:"index" json:"transaction_id,omitempty"`
	TransactionUUID string `gorm:"type:varchar(64)" json:"transaction_uuid,omitempty"`
	Processed bool      `gorm:"default:false" json:"processed"`
	CreatedAt time.Time `json:"created_at"`
}

func (n *NotificationLog) GenerateHash() {
	hash := sha256.Sum256([]byte(n.Message))
	n.Hash = hex.EncodeToString(hash[:])
}

func HashMessage(message string) string {
	hash := sha256.Sum256([]byte(message))
	return hex.EncodeToString(hash[:])
}
