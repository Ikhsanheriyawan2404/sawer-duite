package domain

import (
	"time"

	"gorm.io/gorm"
)

type Transaction struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UUID        string         `gorm:"uniqueIndex;not null" json:"uuid"`
	TargetID    uint           `gorm:"not null" json:"target_id"`
	Target      User           `gorm:"foreignKey:TargetID" json:"-"`
	DonorUserID *uint          `gorm:"index" json:"donor_user_id,omitempty"`
	SupporterID string         `gorm:"type:varchar(64)" json:"supporter_id,omitempty"`
	Sender      string         `json:"sender"`
	Amount      int            `json:"amount"`      // Total to pay with unique code (e.g., 50089)
	BaseAmount  int            `json:"base_amount"` // Original amount (e.g., 50000)
	Note        string         `json:"note"`
	CustomInputJSON map[string]string `gorm:"type:jsonb;serializer:json" json:"custom_input_json"`
	MediaURL    string         `gorm:"type:text" json:"media_url"`
	QRISPayload string         `json:"qris_payload"`
	Status      string         `gorm:"default:'PENDING'" json:"status"` // PENDING, PAID, EXPIRED
	IsQueue     bool           `gorm:"default:true" json:"is_queue"`    // true = in queue, false = out of queue
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	ExpiredAt   time.Time      `json:"expired_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type CreateTransactionRequest struct {
	Username    string `json:"username"`     // target username
	Sender      string `json:"sender"`
	Amount      int    `json:"amount"`       // Base amount
	Note        string `json:"note"`
	CustomInputJSON map[string]string `json:"custom_input_json"`
	MediaURL    string `json:"media_url"`
	SupporterID string `json:"supporter_id"`
	DonorUserID *uint  `json:"-"`
}

type CreateTransactionResponse struct {
	UUID        string    `json:"uuid"`
	Amount      int       `json:"amount"`      // Total with unique code
	BaseAmount  int       `json:"base_amount"` // Original
	QRISPayload string    `json:"qris_payload"`
	ExpiredAt   time.Time `json:"expired_at"`
}

type UpdateQueueRequest struct {
	IsQueue bool `json:"is_queue"`
}

type QueueListQuery struct {
	Username string `json:"username"`
	Status   string `json:"status"`    // optional: pending, paid, expired
	IsQueue  *bool  `json:"is_queue"`  // optional: filter by queue status
	SortBy   string `json:"sort_by"`   // amount, created_at (default: amount)
	Order    string `json:"order"`     // asc, desc (default: desc)
	Limit    int    `json:"limit"`     // default: 50
	Offset   int    `json:"offset"`    // default: 0
}


type PublicTransaction struct {
	ID          uint              `json:"id"`
	UUID        string            `json:"uuid"`
	TargetID    uint              `json:"target_id"`
	Target      PublicUser `json:"target"`
	DonorUserID *uint              `json:"donor_user_id,omitempty"`
	SupporterID string            `json:"supporter_id,omitempty"`
	Sender      string            `json:"sender"`
	Amount      int               `json:"amount"`
	BaseAmount  int               `json:"base_amount"`
	Note        string            `json:"note"`
	CustomInputJSON map[string]string `json:"custom_input_json,omitempty"`
	MediaURL    string            `json:"media_url,omitempty"`
	QRISPayload string            `json:"qris_payload"`
	Status      string            `json:"status"`
	IsQueue     bool              `json:"is_queue"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	ExpiredAt   time.Time         `json:"expired_at"`
}

type OverlayListItem struct {
	Sender string `json:"sender"`
	Amount int    `json:"amount"`
}

type AnalyticsSummary struct {
	TotalNominal    int64   `json:"total_nominal"`
	TotalCount      int64   `json:"total_count"`
	AverageValue    float64 `json:"average_value"`
	TotalSupporters int64   `json:"total_supporters"`
}

type AnalyticsResponse struct {
	Summary      AnalyticsSummary    `json:"summary"`
	Transactions []PublicTransaction `json:"transactions"`
	Pagination   struct {
		CurrentPage int  `json:"current_page"`
		TotalPages  int  `json:"total_pages"`
		HasNext     bool `json:"has_next"`
		HasPrev     bool `json:"has_prev"`
	} `json:"pagination"`
}

func ToPublicTransaction(tx Transaction) PublicTransaction {
	return PublicTransaction{
		ID:          tx.ID,
		UUID:        tx.UUID,
		TargetID:    tx.TargetID,
		Target:      tx.Target.ToPublic(),
		DonorUserID: tx.DonorUserID,
		SupporterID: tx.SupporterID,
		Sender:      tx.Sender,
		Amount:      tx.Amount,
		BaseAmount:  tx.BaseAmount,
		Note:        tx.Note,
		CustomInputJSON: tx.CustomInputJSON,
		MediaURL:    tx.MediaURL,
		QRISPayload: tx.QRISPayload,
		Status:      tx.Status,
		IsQueue:     tx.IsQueue,
		CreatedAt:   tx.CreatedAt,
		UpdatedAt:   tx.UpdatedAt,
		ExpiredAt:   tx.ExpiredAt,
	}
}
