package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UUID      string         `gorm:"type:uuid;uniqueIndex;not null" json:"uuid"`
	Email     string         `gorm:"uniqueIndex;not null" json:"email"`
	Username  string         `gorm:"uniqueIndex;not null" json:"username"`
	Password  string         `gorm:"not null" json:"-"`
	AppToken  string         `gorm:"uniqueIndex" json:"app_token"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Profile      CreatorProfile `gorm:"foreignKey:UserID" json:"profile"`
	Config       DonationConfig `gorm:"foreignKey:UserID" json:"config"`
	Payment      PaymentAccount `gorm:"foreignKey:UserID" json:"payment"`
	AlertConfig  AlertConfig    `gorm:"foreignKey:UserID" json:"alert_config"`
	QueueConfig  QueueConfig    `gorm:"foreignKey:UserID" json:"queue_config"`
	ListConfig   ListOverlayConfig `gorm:"foreignKey:UserID" json:"list_config"`
	QRConfig     QRConfig       `gorm:"foreignKey:UserID" json:"qr_config"`
	MediaConfig  MediaOverlayConfig `gorm:"foreignKey:UserID" json:"media_config"`
	DonationPackages []DonationPackage `gorm:"foreignKey:UserID" json:"donation_packages"`
	ActiveGoal   *DonationGoal  `gorm:"-" json:"active_goal,omitempty"` // Virtual field for public info
}

type CreatorProfile struct {
	ID          uint   `gorm:"primaryKey" json:"-"`
	UserID      uint   `gorm:"uniqueIndex;not null" json:"-"`
	Name        string `json:"name"`
	Bio         string `gorm:"type:text" json:"bio"`
	AvatarURL   string `json:"avatar_url"`
	SocialLinks SocialLinks `gorm:"type:jsonb;serializer:json" json:"social_links"`
}

type SocialLinks struct {
	TikTok    string `json:"tiktok,omitempty"`
	Instagram string `json:"instagram,omitempty"`
	YouTube   string `json:"youtube,omitempty"`
	Facebook  string `json:"facebook,omitempty"`
}

type DonationPackage struct {
	ID     uint   `gorm:"primaryKey" json:"-"`
	UserID uint   `gorm:"index;not null" json:"-"`
	Label  string `json:"label"`
	Amount int64  `json:"amount"`
}

type DonationConfig struct {
	ID                  uint              `gorm:"primaryKey" json:"-"`
	UserID              uint              `gorm:"uniqueIndex;not null" json:"-"`
	MinDonation         int64             `json:"min_donation"`
	QuickAmounts        []int64           `gorm:"type:jsonb;serializer:json" json:"quick_amounts"`
	CustomInputSchema   []CustomInputField `gorm:"type:jsonb;serializer:json" json:"custom_input_schema"`
}

type PaymentAccount struct {
	ID         uint   `gorm:"primaryKey" json:"-"`
	UserID     uint   `gorm:"uniqueIndex;not null" json:"-"`
	StaticQRIS string `gorm:"type:text" json:"static_qris"`
	Provider   string `gorm:"type:varchar(20)" json:"provider"` // GOPAY, DANA
}

type DonationGoal struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       uint      `gorm:"index;not null" json:"-"`
	Title        string    `json:"title"`
	TargetAmount int64     `json:"target_amount"`
	CurrentAmount int64     `gorm:"-" json:"current_amount"`
	StartsAt     *time.Time `json:"starts_at,omitempty"`
	EndsAt       *time.Time `json:"ends_at,omitempty"`
	IsActive     bool      `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type PublicUser struct {
	ID                  uint              `json:"id"`
	Username            string            `json:"username"`
	Name                string            `json:"name"`
	Bio                 string            `json:"bio"`
	AvatarURL           string            `json:"avatar_url"`
	SocialLinks         SocialLinks       `json:"social_links"`
	MinDonation         int64             `json:"min_donation"`
	QuickAmounts        []int64           `json:"quick_amounts"`
	DonationPackages    []DonationPackage `json:"donation_packages"`
	CustomInputSchema   []CustomInputField `json:"custom_input_schema"`
	QueueTitle          string            `json:"queue_title"`
	HasQRIS             bool              `json:"has_qris"`
	ActiveGoal          *DonationGoal     `json:"active_goal"`
	AlertConfig         AlertConfig        `json:"alert_config,omitempty"`
	QueueConfig         QueueConfig        `json:"queue_config,omitempty"`
	ListConfig          ListOverlayConfig  `json:"list_config,omitempty"`
	QRConfig            QRConfig           `json:"qr_config,omitempty"`
	MediaConfig         MediaOverlayConfig `json:"media_config,omitempty"`
}

func (u *User) ToPublic() PublicUser {
	return PublicUser{
		ID:                  u.ID,
		Username:            u.Username,
		Name:                u.Profile.Name,
		Bio:                 u.Profile.Bio,
		AvatarURL:           u.Profile.AvatarURL,
		SocialLinks:         u.Profile.SocialLinks,
		MinDonation:         u.Config.MinDonation,
		QuickAmounts:        u.Config.QuickAmounts,
		DonationPackages:    u.DonationPackages,
		CustomInputSchema:   u.Config.CustomInputSchema,
		QueueTitle:          u.QueueConfig.QueueTitle,
		HasQRIS:             u.Payment.StaticQRIS != "",
		ActiveGoal:          u.ActiveGoal,
		AlertConfig:         u.AlertConfig,
		QueueConfig:         u.QueueConfig,
		ListConfig:          u.ListConfig,
		QRConfig:            u.QRConfig,
		MediaConfig:         u.MediaConfig,
	}
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.UUID == "" {
		u.UUID = uuid.New().String()
	}
	if u.AppToken == "" {
		u.AppToken = "sd_" + uuid.New().String()
	}
	return nil
}

type UpdateProfileRequest struct {
	Name                string            `json:"name"`
	Username            string            `json:"username"`
	Bio                 string            `json:"bio"`
	SocialLinks         SocialLinks       `json:"social_links"`
	MinDonation         int64             `json:"min_donation"`
	QuickAmounts        []int64           `json:"quick_amounts"`
	DonationPackages    []DonationPackage `json:"donation_packages"`
	CustomInputSchema   []CustomInputField `json:"custom_input_schema"`
	QueueTitle          string            `json:"queue_title"`
	StaticQRIS          string            `json:"static_qris"`
	Provider            string            `json:"provider"`
}

type UpdateProfileBasicRequest struct {
	Name        string      `json:"name"`
	Username    string      `json:"username"`
	Bio         string      `json:"bio"`
	SocialLinks SocialLinks `json:"social_links"`
}

type UpdatePaymentRequest struct {
	StaticQRIS string `json:"static_qris"`
	Provider   string `json:"provider"`
}

type UpdateConfigRequest struct {
	MinDonation         *int64              `json:"min_donation"`
	QuickAmounts        *[]int64            `json:"quick_amounts"`
	CustomInputSchema   *[]CustomInputField `json:"custom_input_schema"`
}

type UpdateAlertConfigRequest struct {
}

type UpdateQueueConfigRequest struct {
	QueueTitle *string `json:"queue_title"`
}
type UpdateListConfigRequest struct {
	Title         *string    `json:"title"`
	StartsAt      *time.Time `json:"starts_at"`
	EndsAt        *time.Time `json:"ends_at"`
	ClearStartsAt *bool      `json:"clear_starts_at"`
	ClearEndsAt   *bool      `json:"clear_ends_at"`
}

type UpdateQRConfigRequest struct {
	TopText    *string `json:"top_text"`
	BottomText *string `json:"bottom_text"`
}

type UpdateMediaConfigRequest struct {
	Enabled *bool `json:"enabled"`
}

type CreateGoalRequest struct {
	Title        string     `json:"title"`
	TargetAmount int64      `json:"target_amount"`
	StartsAt     *time.Time `json:"starts_at"`
	EndsAt       *time.Time `json:"ends_at"`
	IsActive     *bool      `json:"is_active"`
}

type UpdateGoalRequest struct {
	Title        *string    `json:"title"`
	TargetAmount *int64     `json:"target_amount"`
	StartsAt     *time.Time `json:"starts_at"`
	EndsAt       *time.Time `json:"ends_at"`
	ClearStartsAt *bool     `json:"clear_starts_at"`
	ClearEndsAt   *bool     `json:"clear_ends_at"`
	IsActive     *bool      `json:"is_active"`
}

type CustomInputField struct {
	Key      string `json:"key"`
	Label    string `json:"label"`
	Required bool   `json:"required"`
}

type AlertConfig struct {
	ID        uint  `gorm:"primaryKey" json:"-"`
	UserID    uint  `gorm:"uniqueIndex;not null" json:"-"`
}

type QueueConfig struct {
	ID       uint   `gorm:"primaryKey" json:"-"`
	UserID   uint   `gorm:"uniqueIndex;not null" json:"-"`
	QueueTitle string `json:"queue_title"`
}

type QRConfig struct {
	ID         uint   `gorm:"primaryKey" json:"-"`
	UserID     uint   `gorm:"uniqueIndex;not null" json:"-"`
	TopText    string `json:"top_text"`
	BottomText string `json:"bottom_text"`
}

type MediaOverlayConfig struct {
	ID      uint `gorm:"primaryKey" json:"-"`
	UserID  uint `gorm:"uniqueIndex;not null" json:"-"`
	Enabled bool `json:"enabled"`
}

type ListOverlayConfig struct {
	ID       uint       `gorm:"primaryKey" json:"-"`
	UserID   uint       `gorm:"uniqueIndex;not null" json:"-"`
	Title    string     `json:"title"`
	StartsAt *time.Time `json:"starts_at,omitempty"`
	EndsAt   *time.Time `json:"ends_at,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email                string `json:"email"`
	Password             string `json:"password"`
	PasswordConfirmation string `json:"password_confirmation"`
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
