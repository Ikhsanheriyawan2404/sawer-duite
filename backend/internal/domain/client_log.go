package domain

import "time"

type ClientLog struct {
  ID        uint           `gorm:"primaryKey" json:"id"`
  UserID    uint           `gorm:"index" json:"user_id"`
  Event     string         `gorm:"type:varchar(64);index" json:"event"`
  Level     string         `gorm:"type:varchar(16)" json:"level"`
  Message   string         `gorm:"type:text" json:"message"`
  Data      string         `gorm:"type:text" json:"data"`
  Device    string         `gorm:"type:text" json:"device"`
  Error     string         `gorm:"type:text" json:"error"`
  CreatedAt time.Time      `json:"created_at"`
}
