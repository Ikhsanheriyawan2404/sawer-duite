package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DonationPackage struct {
	Label  string `json:"label"`
	Amount int64  `json:"amount"`
}

type User struct {
	ID                uint              `gorm:"primaryKey" json:"id"`
	UUID              string            `gorm:"type:uuid;uniqueIndex;not null" json:"uuid"`
	Email             string            `gorm:"uniqueIndex;not null" json:"email"`
	Username          string            `gorm:"uniqueIndex;not null" json:"username"`
	Password          string            `gorm:"not null" json:"-"`
	Name              string            `json:"name"`
	Bio               string            `gorm:"type:text" json:"bio"`
	TikTok            string            `json:"tiktok"`
	Instagram         string            `json:"instagram"`
	YouTube           string            `json:"youtube"`
	MinDonation       int64             `json:"min_donation"`
	TargetAmount      int64             `json:"target_amount"`
	TargetDescription string            `json:"target_description"`
	QuickAmounts      []int64           `gorm:"type:jsonb;serializer:json" json:"quick_amounts"`
	DonationPackages  []DonationPackage `gorm:"type:jsonb;serializer:json" json:"donation_packages"`
	// Custom input field untuk donasi (misal: username roblox, ID game, dll)
	CustomInputLabel    string `json:"custom_input_label"`    // Label field (contoh: "Username Roblox")
	CustomInputRequired bool   `json:"custom_input_required"` // Apakah wajib diisi
	QueueTitle          string `json:"queue_title"`           // Judul antrian di overlay (contoh: "Antrian Donasi")
	
	// Payment settings
	StaticQRIS string `gorm:"type:text" json:"static_qris"`
	Provider   string `gorm:"type:varchar(20)" json:"provider"` // GOPAY, DANA
	AppToken   string `gorm:"uniqueIndex" json:"app_token"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.UUID == "" {
		u.UUID = uuid.New().String()
	}
	if u.AppToken == "" {
		u.AppToken = "sd_" + uuid.New().String() // sawerduite_token
	}
	return nil
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UpdateProfileRequest struct {
	Name                string            `json:"name"`
	Username            string            `json:"username"`
	Bio                 string            `json:"bio"`
	TikTok              string            `json:"tiktok"`
	Instagram           string            `json:"instagram"`
	YouTube             string            `json:"youtube"`
	MinDonation         int64             `json:"min_donation"`
	TargetAmount        int64             `json:"target_amount"`
	TargetDescription   string            `json:"target_description"`
	QuickAmounts        []int64           `json:"quick_amounts"`
	DonationPackages    []DonationPackage `json:"donation_packages"`
	CustomInputLabel    string            `json:"custom_input_label"`
	CustomInputRequired bool              `json:"custom_input_required"`
	QueueTitle          string            `json:"queue_title"`
	StaticQRIS          string            `json:"static_qris"`
	Provider            string            `json:"provider"`
}

type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         User   `json:"user"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type RefreshResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}
