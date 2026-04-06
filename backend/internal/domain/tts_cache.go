package domain

import (
	"crypto/sha256"
	"encoding/hex"
	"time"
)

type TTSCache struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TextHash  string    `gorm:"type:varchar(64);uniqueIndex;not null" json:"text_hash"`
	FileName  string    `gorm:"type:varchar(100);not null" json:"file_name"`
	AudioURL  string    `gorm:"type:text;not null" json:"audio_url"`
	CreatedAt time.Time `json:"created_at"`
}

func GenerateTextHash(text string) string {
	hash := sha256.Sum256([]byte(text))
	return hex.EncodeToString(hash[:])
}
