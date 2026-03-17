package domain

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DBURL             string
	JWTSecret          string
	JWTRefreshSecret   string
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	WebhookSecret      string

	RedisURL          string
	RateLimitRequests int
	RateLimitDuration time.Duration
	DefaultStaticQRIS  string
}

func GetConfig() Config {
	_ = godotenv.Load()

	return Config{
		DBURL:             getEnv("DB_URL", "host=localhost user=postgres password=postgres dbname=ongob port=5432 sslmode=disable"),
		JWTSecret:         getEnv("JWT_SECRET", "super-secret-access-key"),
		JWTRefreshSecret:  getEnv("JWT_REFRESH_SECRET", "super-secret-refresh-key"),
		AccessTokenTTL:    parseDuration(getEnv("ACCESS_TOKEN_TTL", "15m")),
		RefreshTokenTTL:   parseDuration(getEnv("REFRESH_TOKEN_TTL", "168h")),
		WebhookSecret:     getEnv("WEBHOOK_SECRET", "ongob-webhook-secret-123"),
		RedisURL:          getEnv("REDIS_URL", "localhost:6379"),
		RateLimitRequests: getIntEnv("RATE_LIMIT_REQUESTS", 10),
		RateLimitDuration: parseDuration(getEnv("RATE_LIMIT_DURATION", "1m")),
		DefaultStaticQRIS: getEnv("DEFAULT_STATIC_QRIS", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getIntEnv(key string, fallback int) int {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return fallback
	}
	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return fallback
	}
	return value
}

func parseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		log.Printf("Warning: failed to parse duration %s, using fallback", s)
		return 15 * time.Minute
	}
	return d
}
