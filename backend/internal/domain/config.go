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

	RedisURL          string
	RateLimitRequests int
	RateLimitDuration time.Duration

	GoogleAPIKey string

	MinIOEndpoint  string
	MinIOAccessKey string
	MinIOSecretKey string
	MinIOBucket    string
	MinIOUseSSL    bool
	MinIOPublicURL string
}

func GetConfig() Config {
	_ = godotenv.Load()

	return Config{
		DBURL:             getEnv("DB_URL", "host=localhost user=postgres password=postgres dbname=sawerduite port=5432 sslmode=disable"),
		JWTSecret:         getEnv("JWT_SECRET", "super-secret-access-key"),
		JWTRefreshSecret:  getEnv("JWT_REFRESH_SECRET", "super-secret-refresh-key"),
		AccessTokenTTL:    parseDuration(getEnv("ACCESS_TOKEN_TTL", "15m")),
		RefreshTokenTTL:   parseDuration(getEnv("REFRESH_TOKEN_TTL", "168h")),
		RedisURL:          getEnv("REDIS_URL", "localhost:6379"),
		RateLimitRequests: getIntEnv("RATE_LIMIT_REQUESTS", 10),
		RateLimitDuration: parseDuration(getEnv("RATE_LIMIT_DURATION", "1m")),

		GoogleAPIKey: getEnv("GOOGLE_API_KEY", ""),

		MinIOEndpoint:  getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinIOAccessKey: getEnv("MINIO_ACCESS_KEY", ""),
		MinIOSecretKey: getEnv("MINIO_SECRET_KEY", ""),
		MinIOBucket:    getEnv("MINIO_BUCKET", "sawerduite-tts"),
		MinIOUseSSL:    getEnv("MINIO_USE_SSL", "false") == "true",
		MinIOPublicURL: getEnv("MINIO_PUBLIC_URL", "http://localhost:9000/sawerduite-tts"),
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
