package service

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	config   domain.Config
	userRepo *repository.UserRepository
}

func NewAuthService(config domain.Config, userRepo *repository.UserRepository) *AuthService {
	return &AuthService{
		config:   config,
		userRepo: userRepo,
	}
}

func (s *AuthService) Register(req domain.RegisterRequest) (*domain.LoginResponse, error) {
	if req.Email == "" || req.Password == "" {
		return nil, errors.New("email and password are required")
	}

	if req.Password != req.PasswordConfirmation {
		return nil, errors.New("passwords do not match")
	}

	if len(req.Password) < 8 {
		return nil, errors.New("password must be at least 8 characters")
	}

	existing, _ := s.userRepo.GetByEmail(req.Email)
	if existing != nil {
		return nil, errors.New("email already registered")
	}

	username := ""
	parts := strings.Split(req.Email, "@")
	if len(parts) > 0 {
		username = parts[0]
	}

	baseUsername := username
	for i := 1; ; i++ {
		u, _ := s.userRepo.GetByUsername(username)
		if u == nil {
			break
		}
		username = baseUsername + strconv.Itoa(i)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to process password")
	}

	user := domain.User{
		Email:    req.Email,
		Username: username,
		Password: string(hashedPassword),
		Name:     username,
	}

	if err := s.userRepo.Create(&user); err != nil {
		return nil, errors.New("failed to create user")
	}

	accessToken, _ := s.GenerateAccessToken(user.ID)
	refreshToken, _ := s.GenerateRefreshToken(user.ID)

	return &domain.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}, nil
}

func (s *AuthService) Login(req domain.LoginRequest) (*domain.LoginResponse, error) {
	user, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	accessToken, err := s.GenerateAccessToken(user.ID)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	refreshToken, err := s.GenerateRefreshToken(user.ID)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	return &domain.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         *user,
	}, nil
}

func (s *AuthService) Refresh(refreshToken string) (*domain.RefreshResponse, error) {
	userID, err := s.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	newAccessToken, err := s.GenerateAccessToken(userID)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	newRefreshToken, err := s.GenerateRefreshToken(userID)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	return &domain.RefreshResponse{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
	}, nil
}

func (s *AuthService) GetUserByID(id uint) (*domain.User, error) {
	return s.userRepo.GetByID(id)
}

func (s *AuthService) GetUserByUsername(username string) (*domain.User, error) {
	return s.userRepo.GetByUsername(username)
}

func (s *AuthService) GetUserByUUID(uuid string) (*domain.User, error) {
	return s.userRepo.GetByUUID(uuid)
}

func (s *AuthService) GetUserByAppToken(token string) (*domain.User, error) {
	return s.userRepo.GetByAppToken(token)
}

func (s *AuthService) UpdateProfile(userID uint, req domain.UpdateProfileRequest) (*domain.User, error) {
	if req.Name == "" || req.Username == "" {
		return nil, errors.New("name and username are required")
	}

	existingUser, _ := s.userRepo.GetByUsername(req.Username)
	if existingUser != nil && existingUser.ID != userID {
		return nil, errors.New("username already taken")
	}

	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	user.UpdateFromRequest(req)

	if err := s.userRepo.Update(user); err != nil {
		return nil, errors.New("failed to update profile")
	}

	return user, nil
}

func (s *AuthService) ListPublicUsers(limit int) ([]domain.User, error) {
	return s.userRepo.ListPublicUsers(limit)
}

func (s *AuthService) GenerateAccessToken(userID uint) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(s.config.AccessTokenTTL).Unix(),
		"type":    "access",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.JWTSecret))
}

func (s *AuthService) GenerateRefreshToken(userID uint) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(s.config.RefreshTokenTTL).Unix(),
		"type":    "refresh",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.JWTRefreshSecret))
}

func (s *AuthService) ValidateAccessToken(tokenString string) (uint, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		return []byte(s.config.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return 0, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["type"] != "access" {
		return 0, errors.New("invalid claims")
	}

	userID := uint(claims["user_id"].(float64))
	return userID, nil
}

func (s *AuthService) ValidateRefreshToken(tokenString string) (uint, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		return []byte(s.config.JWTRefreshSecret), nil
	})

	if err != nil || !token.Valid {
		return 0, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["type"] != "refresh" {
		return 0, errors.New("invalid claims")
	}

	userID := uint(claims["user_id"].(float64))
	return userID, nil
}
