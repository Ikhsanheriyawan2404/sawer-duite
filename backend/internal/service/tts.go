package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/ikhsan/ongob/backend/internal/domain"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type TTSService struct {
	db          *gorm.DB
	rdb         *redis.Client
	minioClient *minio.Client
	config      domain.Config
}

type GoogleTTSRequest struct {
	Input       struct{ Text string `json:"text"` } `json:"input"`
	Voice       struct {
		LanguageCode string `json:"languageCode"`
		Name         string `json:"name"`
	} `json:"voice"`
	AudioConfig struct{ AudioEncoding string `json:"audioEncoding"` } `json:"audioConfig"`
}

type GoogleTTSResponse struct {
	AudioContent string `json:"audioContent"`
}

func NewTTSService(db *gorm.DB, rdb *redis.Client, cfg domain.Config) *TTSService {
	// Clean endpoint from http:// or https:// if present
	endpoint := cfg.MinIOEndpoint
	endpoint = strings.TrimPrefix(endpoint, "http://")
	endpoint = strings.TrimPrefix(endpoint, "https://")

	log.Printf("[TTS] Initializing MinIO with endpoint: %s (SSL: %v)", endpoint, cfg.MinIOUseSSL)

	minioClient, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOAccessKey, cfg.MinIOSecretKey, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		log.Printf("[TTS] CRITICAL: Error initializing MinIO client: %v", err)
	}

	return &TTSService{
		db:          db,
		rdb:         rdb,
		minioClient: minioClient,
		config:      cfg,
	}
}

func (s *TTSService) Generate(text string) (string, error) {
	if text == "" {
		log.Printf("[TTS] Warning: Empty text passed to Generate")
		return "", nil
	}

	hash := domain.GenerateTextHash(text)
	redisKey := "tts_cache:" + hash

	// 1. Check Redis
	if s.rdb != nil {
		url, err := s.rdb.Get(context.Background(), redisKey).Result()
		if err == nil && url != "" {
			log.Printf("[TTS] Cache hit (Redis): %s", hash)
			return url, nil
		}
	}

	// 2. Check Database
	var cache domain.TTSCache
	if err := s.db.Where("text_hash = ?", hash).First(&cache).Error; err == nil {
		log.Printf("[TTS] Cache hit (DB): %s", hash)
		// Update Redis for faster access next time
		if s.rdb != nil {
			s.rdb.Set(context.Background(), redisKey, cache.AudioURL, 24*time.Hour)
		}
		return cache.AudioURL, nil
	}

	// 3. Generate via Google TTS
	log.Printf("[TTS] Generating new audio for: %s", hash)
	audioData, err := s.callGoogleTTS(text)
	if err != nil {
		log.Printf("[TTS] Google TTS Error: %v", err)
		return "", fmt.Errorf("google tts error: %v", err)
	}

	// 4. Upload to MinIO
	fileName := hash + ".mp3"
	audioURL, err := s.uploadToMinIO(fileName, audioData)
	if err != nil {
		log.Printf("[TTS] MinIO Upload Error: %v", err)
		return "", fmt.Errorf("minio upload error: %v", err)
	}

	// 5. Save to Database
	cache = domain.TTSCache{
		TextHash: hash,
		FileName: fileName,
		AudioURL: audioURL,
	}
	if err := s.db.Create(&cache).Error; err != nil {
		log.Printf("[TTS] Error saving to DB: %v", err)
	}

	// 6. Save to Redis
	if s.rdb != nil {
		s.rdb.Set(context.Background(), redisKey, audioURL, 24*time.Hour)
	}

	log.Printf("[TTS] Successfully generated: %s", audioURL)
	return audioURL, nil
}

func (s *TTSService) callGoogleTTS(text string) ([]byte, error) {
	if s.config.GoogleAPIKey == "" {
		return nil, fmt.Errorf("GOOGLE_API_KEY is empty")
	}

	url := fmt.Sprintf("https://texttospeech.googleapis.com/v1/text:synthesize?key=%s", s.config.GoogleAPIKey)

	reqBody := GoogleTTSRequest{}
	reqBody.Input.Text = text
	reqBody.Voice.LanguageCode = "id-ID"
	reqBody.Voice.Name = "id-ID-Standard-A"
	reqBody.AudioConfig.AudioEncoding = "MP3"

	jsonBody, _ := json.Marshal(reqBody)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google tts api returned status %d: %s", resp.StatusCode, string(body))
	}

	var ttsResp GoogleTTSResponse
	if err := json.NewDecoder(resp.Body).Decode(&ttsResp); err != nil {
		return nil, err
	}

	if ttsResp.AudioContent == "" {
		return nil, fmt.Errorf("google tts api returned empty audio content")
	}

	return base64.StdEncoding.DecodeString(ttsResp.AudioContent)
}

func (s *TTSService) uploadToMinIO(fileName string, data []byte) (string, error) {
	if s.minioClient == nil {
		return "", fmt.Errorf("minio client is nil")
	}

	ctx := context.Background()
	bucketName := s.config.MinIOBucket

	// Ensure bucket exists
	exists, err := s.minioClient.BucketExists(ctx, bucketName)
	if err != nil {
		return "", fmt.Errorf("failed to check bucket existence: %v", err)
	}
	if !exists {
		err = s.minioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
		if err != nil {
			return "", fmt.Errorf("failed to create bucket: %v", err)
		}
		
		policy := fmt.Sprintf(`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}`, bucketName)
		err = s.minioClient.SetBucketPolicy(ctx, bucketName, policy)
		if err != nil {
			log.Printf("[TTS] Warning: failed to set bucket policy: %v", err)
		}
	}

	_, err = s.minioClient.PutObject(ctx, bucketName, fileName, bytes.NewReader(data), int64(len(data)), minio.PutObjectOptions{
		ContentType: "audio/mpeg",
	})
	if err != nil {
		return "", fmt.Errorf("failed to put object: %v", err)
	}

	publicURL := fmt.Sprintf("%s/%s", s.config.MinIOPublicURL, fileName)
	return publicURL, nil
}
