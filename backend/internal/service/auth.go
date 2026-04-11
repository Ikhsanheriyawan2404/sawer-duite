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
	"gorm.io/gorm"
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
	}

	if err := s.userRepo.Create(&user); err != nil {
		return nil, errors.New("failed to create user")
	}

	_ = s.userRepo.CreateProfile(&domain.CreatorProfile{UserID: user.ID, Name: username})
	_ = s.userRepo.CreateConfig(&domain.DonationConfig{UserID: user.ID})
	_ = s.userRepo.CreatePayment(&domain.PaymentAccount{UserID: user.ID})
	_ = s.userRepo.CreateAlertConfig(&domain.AlertConfig{UserID: user.ID})
	_ = s.userRepo.CreateQueueConfig(&domain.QueueConfig{UserID: user.ID, QueueTitle: "Antrean Donasi"})
	_ = s.userRepo.CreateListConfig(&domain.ListOverlayConfig{UserID: user.ID, Title: "Daftar Donatur"})
	_ = s.userRepo.CreateMediaConfig(&domain.MediaOverlayConfig{UserID: user.ID, Enabled: true})
	_ = s.userRepo.CreateQRConfig(&domain.QRConfig{UserID: user.ID, TopText: "Dukung Saya", BottomText: "Scan QR untuk donasi"})

	fullUser, _ := s.userRepo.GetByID(user.ID)

	accessToken, _ := s.GenerateAccessToken(user.ID)
	refreshToken, _ := s.GenerateRefreshToken(user.ID)

	return &domain.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         *fullUser,
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

	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if req.Username != user.Username {
		existing, _ := s.userRepo.GetByUsername(req.Username)
		if existing != nil {
			return nil, errors.New("username already taken")
		}
	}

	user.Username = req.Username

	user.Profile.Name = req.Name
	user.Profile.Bio = req.Bio
	user.Profile.SocialLinks = req.SocialLinks

	user.Config.MinDonation = req.MinDonation
	user.Config.QuickAmounts = req.QuickAmounts
	user.Config.CustomInputSchema = req.CustomInputSchema
	if req.QueueTitle != "" {
		user.QueueConfig.QueueTitle = req.QueueTitle
	}

	user.Payment.StaticQRIS = req.StaticQRIS
	user.Payment.Provider = req.Provider

	if len(req.DonationPackages) > 0 {
		_ = s.userRepo.ReplaceDonationPackages(user.ID, req.DonationPackages)
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, errors.New("failed to update profile")
	}

	return user, nil
}

func (s *AuthService) UpdateProfileBasic(userID uint, req domain.UpdateProfileBasicRequest) (*domain.User, error) {
	if req.Name == "" || req.Username == "" {
		return nil, errors.New("name and username are required")
	}

	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if req.Username != user.Username {
		existing, _ := s.userRepo.GetByUsername(req.Username)
		if existing != nil {
			return nil, errors.New("username already taken")
		}
	}

	user.Username = req.Username
	user.Profile.Name = req.Name
	user.Profile.Bio = req.Bio
	user.Profile.SocialLinks = req.SocialLinks

	if err := s.userRepo.Update(user); err != nil {
		return nil, errors.New("failed to update profile")
	}

	return user, nil
}

func (s *AuthService) UpdatePaymentSettings(userID uint, req domain.UpdatePaymentRequest) (*domain.User, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	user.Payment.StaticQRIS = req.StaticQRIS
	user.Payment.Provider = req.Provider

	if err := s.userRepo.Update(user); err != nil {
		return nil, errors.New("failed to update payment")
	}

	return user, nil
}

func (s *AuthService) UpdateConfig(userID uint, req domain.UpdateConfigRequest) (*domain.User, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if req.MinDonation != nil {
		user.Config.MinDonation = *req.MinDonation
	}
	if req.QuickAmounts != nil {
		user.Config.QuickAmounts = *req.QuickAmounts
	}
	if req.CustomInputSchema != nil {
		user.Config.CustomInputSchema = *req.CustomInputSchema
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, errors.New("failed to update config")
	}

	return user, nil
}

func (s *AuthService) UpdateDonationPackages(userID uint, packages []domain.DonationPackage) (*domain.User, error) {
	if err := s.userRepo.ReplaceDonationPackages(userID, packages); err != nil {
		return nil, errors.New("failed to update donation packages")
	}
	return s.userRepo.GetByID(userID)
}
func (s *AuthService) UpdateAlertConfig(userID uint, req domain.UpdateAlertConfigRequest) (*domain.User, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, errors.New("failed to update alert config")
	}

	return user, nil
	}


func (s *AuthService) UpdateQueueConfig(userID uint, req domain.UpdateQueueConfigRequest) (*domain.User, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	if req.QueueTitle != nil {
		user.QueueConfig.QueueTitle = *req.QueueTitle
	}
	if err := s.userRepo.Update(user); err != nil {
		return nil, errors.New("failed to update queue config")
	}
	return user, nil
}

func (s *AuthService) UpdateListConfig(userID uint, req domain.UpdateListConfigRequest) (*domain.User, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}

	if req.Title != nil {
		user.ListConfig.Title = *req.Title
	}
	if req.SortBy != nil {
		user.ListConfig.SortBy = *req.SortBy
	}
	if req.Limit != nil {
		user.ListConfig.Limit = *req.Limit
	}
	if req.AggrType != nil {
		user.ListConfig.AggrType = *req.AggrType
	}
	if req.StartsAt != nil {
		user.ListConfig.StartsAt = req.StartsAt
	}
	if req.EndsAt != nil {
		user.ListConfig.EndsAt = req.EndsAt
	}
	if req.ClearStartsAt != nil && *req.ClearStartsAt {
		user.ListConfig.StartsAt = nil
	}
	if req.ClearEndsAt != nil && *req.ClearEndsAt {
		user.ListConfig.EndsAt = nil
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *AuthService) UpdateMediaConfig(userID uint, req domain.UpdateMediaConfigRequest) (*domain.User, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if req.Enabled != nil {
		user.MediaConfig.Enabled = *req.Enabled
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, errors.New("failed to update media config")
	}
	return user, nil
}

func (s *AuthService) UpdateQRConfig(userID uint, req domain.UpdateQRConfigRequest) (*domain.User, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if req.TopText != nil {
		user.QRConfig.TopText = *req.TopText
	}
	if req.BottomText != nil {
		user.QRConfig.BottomText = *req.BottomText
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, errors.New("failed to update QR config")
	}

	return user, nil
}


func (s *AuthService) UpdateAvatarURL(userID uint, url string) (*domain.User, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	user.Profile.AvatarURL = url

	if err := s.userRepo.Update(user); err != nil {
		return nil, errors.New("failed to update avatar")
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
		"type":    "REFRESH",
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

func (s *AuthService) ListGoals(userID uint) ([]domain.DonationGoal, error) {
	return s.userRepo.ListGoals(userID)
}

func (s *AuthService) CreateGoal(userID uint, req domain.CreateGoalRequest) (*domain.DonationGoal, error) {
	if req.Title == "" || req.TargetAmount <= 0 {
		return nil, errors.New("title and target_amount are required")
	}
	if req.StartsAt != nil && req.EndsAt != nil && req.StartsAt.After(*req.EndsAt) {
		return nil, errors.New("starts_at must be before ends_at")
	}

	isActive := false
	if req.IsActive != nil {
		isActive = *req.IsActive
	} else {
		if _, err := s.userRepo.GetActiveGoal(userID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				isActive = true
			} else {
				return nil, err
			}
		}
	}

	return s.userRepo.CreateGoal(userID, req, isActive)
}

func (s *AuthService) UpdateGoal(userID uint, goalID uint, req domain.UpdateGoalRequest) (*domain.DonationGoal, error) {
	if req.StartsAt != nil && req.EndsAt != nil && req.StartsAt.After(*req.EndsAt) {
		return nil, errors.New("starts_at must be before ends_at")
	}
	return s.userRepo.UpdateGoal(userID, goalID, req)
}

func (s *AuthService) SetActiveGoal(userID uint, goalID uint) (*domain.DonationGoal, error) {
	return s.userRepo.SetActiveGoal(userID, goalID)
}

func (s *AuthService) DeleteGoal(userID uint, goalID uint) error {
	return s.userRepo.DeleteGoal(userID, goalID)
}
