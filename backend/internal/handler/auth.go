package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/ikhsan/ongob/backend/internal/domain"
	"github.com/ikhsan/ongob/backend/internal/service"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db          *gorm.DB
	authService *service.AuthService
}

func NewAuthHandler(db *gorm.DB, authService *service.AuthService) *AuthHandler {
	return &AuthHandler{db: db, authService: authService}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	var user domain.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		http.Error(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		http.Error(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	accessToken, err := h.authService.GenerateAccessToken(user.ID)
	if err != nil {
		http.Error(w, "failed to generate access token", http.StatusInternalServerError)
		return
	}

	refreshToken, err := h.authService.GenerateRefreshToken(user.ID)
	if err != nil {
		http.Error(w, "failed to generate refresh token", http.StatusInternalServerError)
		return
	}

	response := domain.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req domain.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	userID, err := h.authService.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		http.Error(w, "invalid refresh token", http.StatusUnauthorized)
		return
	}

	newAccessToken, err := h.authService.GenerateAccessToken(userID)
	if err != nil {
		http.Error(w, "failed to generate access token", http.StatusInternalServerError)
		return
	}

	newRefreshToken, err := h.authService.GenerateRefreshToken(userID)
	if err != nil {
		http.Error(w, "failed to generate refresh token", http.StatusInternalServerError)
		return
	}

	response := domain.RefreshResponse{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var user domain.User
	if err := h.db.First(&user, userID).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req domain.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	// Validate
	if req.Name == "" || req.Username == "" {
		http.Error(w, "name and username are required", http.StatusBadRequest)
		return
	}

	// Check if username already taken by another user
	var existingUser domain.User
	if err := h.db.Where("username = ? AND id != ?", req.Username, userID).First(&existingUser).Error; err == nil {
		http.Error(w, "username already taken", http.StatusConflict)
		return
	}

	// Update user
	var user domain.User
	if err := h.db.First(&user, userID).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	user.Name = req.Name
	user.Username = req.Username
	user.Bio = req.Bio
	user.TikTok = req.TikTok
	user.Instagram = req.Instagram
	user.YouTube = req.YouTube
	user.MinDonation = req.MinDonation
	user.TargetAmount = req.TargetAmount
	user.TargetDescription = req.TargetDescription
	user.QuickAmounts = req.QuickAmounts
	user.DonationPackages = req.DonationPackages
	user.CustomInputLabel = req.CustomInputLabel
	user.CustomInputRequired = req.CustomInputRequired
	user.StaticQRIS = req.StaticQRIS
	user.Provider = req.Provider

	if err := h.db.Save(&user).Error; err != nil {
		http.Error(w, "failed to update profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) GetUserByUsername(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")

	var user domain.User
	if err := h.db.Where("username = ?", username).First(&user).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	// Only return public info
	publicUser := struct {
		ID                  uint                     `json:"id"`
		UUID                string                   `json:"uuid"`
		Username            string                   `json:"username"`
		Name                string                   `json:"name"`
		Bio                 string                   `json:"bio"`
		TikTok              string                   `json:"tiktok"`
		Instagram           string                   `json:"instagram"`
		YouTube             string                   `json:"youtube"`
		MinDonation         int64                    `json:"min_donation"`
		TargetAmount        int64                    `json:"target_amount"`
		TargetDescription   string                   `json:"target_description"`
		QuickAmounts        []int64                  `json:"quick_amounts"`
		DonationPackages    []domain.DonationPackage `json:"donation_packages"`
		CustomInputLabel    string                   `json:"custom_input_label"`
		CustomInputRequired bool                     `json:"custom_input_required"`
	}{
		ID:                  user.ID,
		UUID:                user.UUID,
		Username:            user.Username,
		Name:                user.Name,
		Bio:                 user.Bio,
		TikTok:              user.TikTok,
		Instagram:           user.Instagram,
		YouTube:             user.YouTube,
		MinDonation:         user.MinDonation,
		TargetAmount:        user.TargetAmount,
		TargetDescription:   user.TargetDescription,
		QuickAmounts:        user.QuickAmounts,
		DonationPackages:    user.DonationPackages,
		CustomInputLabel:    user.CustomInputLabel,
		CustomInputRequired: user.CustomInputRequired,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(publicUser)
}

func (h *AuthHandler) GetUserByUUID(w http.ResponseWriter, r *http.Request) {
	uuid := chi.URLParam(r, "uuid")

	var user domain.User
	if err := h.db.Where("uuid = ?", uuid).First(&user).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	// Only return public info
	publicUser := struct {
		ID                  uint                     `json:"id"`
		UUID                string                   `json:"uuid"`
		Username            string                   `json:"username"`
		Name                string                   `json:"name"`
		Bio                 string                   `json:"bio"`
		TikTok              string                   `json:"tiktok"`
		Instagram           string                   `json:"instagram"`
		YouTube             string                   `json:"youtube"`
		MinDonation         int64                    `json:"min_donation"`
		TargetAmount        int64                    `json:"target_amount"`
		TargetDescription   string                   `json:"target_description"`
		QuickAmounts        []int64                  `json:"quick_amounts"`
		DonationPackages    []domain.DonationPackage `json:"donation_packages"`
		CustomInputLabel    string                   `json:"custom_input_label"`
		CustomInputRequired bool                     `json:"custom_input_required"`
	}{
		ID:                  user.ID,
		UUID:                user.UUID,
		Username:            user.Username,
		Name:                user.Name,
		Bio:                 user.Bio,
		TikTok:              user.TikTok,
		Instagram:           user.Instagram,
		YouTube:             user.YouTube,
		MinDonation:         user.MinDonation,
		TargetAmount:        user.TargetAmount,
		TargetDescription:   user.TargetDescription,
		QuickAmounts:        user.QuickAmounts,
		DonationPackages:    user.DonationPackages,
		CustomInputLabel:    user.CustomInputLabel,
		CustomInputRequired: user.CustomInputRequired,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(publicUser)
}
