package handler

import (
	"net/http"
	"strconv"

	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/service"
	"github.com/go-chi/chi/v5"
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
	if !BindJSON(w, r, &req) {
		return
	}

	var user domain.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		JSONError(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		JSONError(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	accessToken, err := h.authService.GenerateAccessToken(user.ID)
	if err != nil {
		JSONError(w, "failed to generate access token", http.StatusInternalServerError)
		return
	}

	refreshToken, err := h.authService.GenerateRefreshToken(user.ID)
	if err != nil {
		JSONError(w, "failed to generate refresh token", http.StatusInternalServerError)
		return
	}

	JSONResponse(w, http.StatusOK, domain.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	})
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req domain.RefreshRequest
	if !BindJSON(w, r, &req) {
		return
	}

	userID, err := h.authService.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		JSONError(w, "invalid refresh token", http.StatusUnauthorized)
		return
	}

	newAccessToken, err := h.authService.GenerateAccessToken(userID)
	if err != nil {
		JSONError(w, "failed to generate access token", http.StatusInternalServerError)
		return
	}

	newRefreshToken, err := h.authService.GenerateRefreshToken(userID)
	if err != nil {
		JSONError(w, "failed to generate refresh token", http.StatusInternalServerError)
		return
	}

	JSONResponse(w, http.StatusOK, domain.RefreshResponse{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
	})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var user domain.User
	if err := h.db.First(&user, userID).Error; err != nil {
		JSONError(w, "user not found", http.StatusNotFound)
		return
	}

	JSONResponse(w, http.StatusOK, user)
}

func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req domain.UpdateProfileRequest
	if !BindJSON(w, r, &req) {
		return
	}

	if req.Name == "" || req.Username == "" {
		JSONError(w, "name and username are required", http.StatusBadRequest)
		return
	}

	var existingUser domain.User
	if err := h.db.Where("username = ? AND id != ?", req.Username, userID).First(&existingUser).Error; err == nil {
		JSONError(w, "username already taken", http.StatusConflict)
		return
	}

	var user domain.User
	if err := h.db.First(&user, userID).Error; err != nil {
		JSONError(w, "user not found", http.StatusNotFound)
		return
	}

	user.UpdateFromRequest(req)

	if err := h.db.Save(&user).Error; err != nil {
		JSONError(w, "failed to update profile", http.StatusInternalServerError)
		return
	}

	JSONResponse(w, http.StatusOK, user)
}

func (h *AuthHandler) GetUserByUsername(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")

	var user domain.User
	if err := h.db.Where("username = ?", username).First(&user).Error; err != nil {
		JSONError(w, "user not found", http.StatusNotFound)
		return
	}

	JSONResponse(w, http.StatusOK, user.ToPublic())
}

func (h *AuthHandler) GetUserByUUID(w http.ResponseWriter, r *http.Request) {
	uuid := chi.URLParam(r, "uuid")

	var user domain.User
	if err := h.db.Where("uuid = ?", uuid).First(&user).Error; err != nil {
		JSONError(w, "user not found", http.StatusNotFound)
		return
	}

	JSONResponse(w, http.StatusOK, user.ToPublic())
}

func (h *AuthHandler) ListPublicUsers(w http.ResponseWriter, r *http.Request) {
	limit := 12
	if v := r.URL.Query().Get("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			if parsed < 1 {
				limit = 1
			} else if parsed > 50 {
				limit = 50
			} else {
				limit = parsed
			}
		}
	}

	var users []domain.User
	if err := h.db.Select("username", "name").
		Order("created_at desc").
		Limit(limit).
		Find(&users).Error; err != nil {
		JSONError(w, "failed to fetch users", http.StatusInternalServerError)
		return
	}

	type minimalUser struct {
		Username string `json:"username"`
		Name     string `json:"name"`
	}

	publicUsers := make([]minimalUser, 0, len(users))
	for _, user := range users {
		publicUsers = append(publicUsers, minimalUser{
			Username: user.Username,
			Name:     user.Name,
		})
	}

	JSONResponse(w, http.StatusOK, publicUsers)
}
