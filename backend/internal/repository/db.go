package repository

import (
	"log"

	"github.com/google/uuid"
	"github.com/ikhsan/ongob/backend/internal/domain"
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
		&domain.Transaction{},
		&domain.NotificationLog{},
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

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("asintel"), bcrypt.DefaultCost)
	user := domain.User{
		UUID:              uuid.New().String(),
		Email:             "admin@gmail.com",
		Username:          "ongob",
		Password:          string(hashedPassword),
		Name:              "Aikyy",
		Bio:               "Terimakasih! Jangan lupa tulis username kalian yaa! Supaya diupdate di Leaderboard",
		TikTok:            "https://tiktok.com/@ongobkun",
		Instagram:         "https://instagram.com/kychan.real",
		YouTube:           "https://youtube.com/@aikyyfishit",
		MinDonation:       10_000,
		TargetAmount:      40_000_000,
		TargetDescription: "Support untuk perkembangan Indo Outfit Loader",
	}


	if err := db.Create(&user).Error; err != nil {
		log.Println("Failed to seed user:", err)
	} else {
		log.Println("Default user seeded: admin@gmail.com / asintel")
	}
}
