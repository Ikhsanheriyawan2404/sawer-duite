package repository

import (
	"log"

	"github.com/google/uuid"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func InitDB(cfg domain.Config) *gorm.DB {
	db, err := gorm.Open(postgres.Open(cfg.DBURL), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	err = db.AutoMigrate(
		&domain.User{},
		&domain.CreatorProfile{},
		&domain.DonationConfig{},
		&domain.DonationPackage{},
		&domain.AlertConfig{},
		&domain.QueueConfig{},
		&domain.ListOverlayConfig{},
		&domain.QRConfig{},
		&domain.MediaOverlayConfig{},
		&domain.PaymentAccount{},
		&domain.DonationGoal{},
		&domain.Transaction{},
		&domain.NotificationLog{},
		&domain.ClientLog{},
		&domain.TTSCache{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	SeedUser(db)

	return db
}

func SeedUser(db *gorm.DB) {
	var count int64
	db.Model(&domain.User{}).Count(&count)
	if count > 0 {
		return
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("anone"), bcrypt.DefaultCost)
	user := domain.User{
		UUID:     uuid.New().String(),
		Email:    "admin@gmail.com",
		Username: "sawerduite",
		Password: string(hashedPassword),
	}

	if err := db.Create(&user).Error; err != nil {
		log.Println("Failed to seed user:", err)
		return
	}

	db.Create(&domain.CreatorProfile{
		UserID: user.ID,
		Name:   "Aikyy",
		Bio:    "Terimakasih! Jangan lupa tulis username kalian yaa! Supaya diupdate di Leaderboard",
		SocialLinks: domain.SocialLinks{
			TikTok:    "https://tiktok.com/@sawerduite",
			Instagram: "https://instagram.com/kychan.real",
			YouTube:   "https://youtube.com/@aikyyfishit",
		},
	})

	db.Create(&domain.DonationConfig{
		UserID:              user.ID,
		MinDonation:         10_000,
		QuickAmounts:        []int64{},
		CustomInputSchema:   []domain.CustomInputField{},
	})

	db.Create(&domain.DonationPackage{
		UserID: user.ID,
		Label:  "Review Akun",
		Amount: 50_000,
	})

	db.Create(&domain.DonationPackage{
		UserID: user.ID,
		Label:  "Request Lagu",
		Amount: 25_000,
	})

	db.Create(&domain.AlertConfig{
		UserID:    user.ID,
	})

	db.Create(&domain.QueueConfig{
		UserID:     user.ID,
		QueueTitle: "Antrean Donasi",
	})

	db.Create(&domain.ListOverlayConfig{
		UserID: user.ID,
		Title:  "Daftar Donatur",
	})

	db.Create(&domain.QRConfig{
		UserID:     user.ID,
		TopText:    "Dukung Saya",
		BottomText: "Scan QR untuk donasi",
	})

	db.Create(&domain.MediaOverlayConfig{
		UserID:  user.ID,
		Enabled: true,
	})

	db.Create(&domain.PaymentAccount{
		UserID:   user.ID,
		Provider: "DANA",
	})

	db.Create(&domain.DonationGoal{
		UserID:       user.ID,
		Title:        "Support untuk perkembangan Indo Outfit Loader",
		TargetAmount: 40_000_000,
		IsActive:     true,
	})

	log.Println("Default user and profiles seeded: admin@gmail.com / anone")
}
