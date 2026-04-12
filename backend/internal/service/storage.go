package service

import (
	"context"
	"fmt"
	"io"
	"log"
	"strings"

	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type StorageService struct {
	minioClient *minio.Client
	config      domain.Config
}

func NewStorageService(cfg domain.Config) *StorageService {
	endpoint := cfg.MinIOEndpoint
	endpoint = strings.TrimPrefix(endpoint, "http://")
	endpoint = strings.TrimPrefix(endpoint, "https://")

	minioClient, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOAccessKey, cfg.MinIOSecretKey, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		log.Printf("[Storage] CRITICAL: Error initializing MinIO client: %v", err)
	}

	return &StorageService{
		minioClient: minioClient,
		config:      cfg,
	}
}

func (s *StorageService) ensureBucket(ctx context.Context) error {
	if s.minioClient == nil {
		return fmt.Errorf("minio client is nil")
	}

	bucketName := s.config.MinIOBucket
	exists, err := s.minioClient.BucketExists(ctx, bucketName)
	if err != nil {
		return fmt.Errorf("failed to check bucket existence: %v", err)
	}
	if !exists {
		err = s.minioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
		if err != nil {
			return fmt.Errorf("failed to create bucket: %v", err)
		}

		policy := fmt.Sprintf(`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}`, bucketName)
		if err := s.minioClient.SetBucketPolicy(ctx, bucketName, policy); err != nil {
			log.Printf("[Storage] Warning: failed to set bucket policy: %v", err)
		}
	}

	return nil
}

func (s *StorageService) UploadPublicObject(objectName string, reader io.Reader, size int64, contentType string) (string, error) {
	if s.minioClient == nil {
		return "", fmt.Errorf("minio client is nil")
	}

	ctx := context.Background()
	if err := s.ensureBucket(ctx); err != nil {
		return "", err
	}

	_, err := s.minioClient.PutObject(ctx, s.config.MinIOBucket, objectName, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to put object: %v", err)
	}

	publicURL := fmt.Sprintf("%s/%s", s.config.MinIOPublicURL, objectName)
	return publicURL, nil
}
