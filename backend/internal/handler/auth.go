package handler

import (
	"net/http"
	"strconv"

	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req domain.RegisterRequest
	if !BindJSON(w, r, &req) {
		return
	}

	resp, err := h.authService.Register(req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "email and password are required" || err.Error() == "passwords do not match" || err.Error() == "password must be at least 8 characters" {
			status = http.StatusBadRequest
		} else if err.Error() == "email already registered" {
			status = http.StatusConflict
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusCreated, resp)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if !BindJSON(w, r, &req) {
		return
	}

	resp, err := h.authService.Login(req)
	if err != nil {
		JSONError(w, err.Error(), http.StatusUnauthorized)
		return
	}

	JSONResponse(w, http.StatusOK, resp)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req domain.RefreshRequest
	if !BindJSON(w, r, &req) {
		return
	}

	resp, err := h.authService.Refresh(req.RefreshToken)
	if err != nil {
		JSONError(w, err.Error(), http.StatusUnauthorized)
		return
	}

	JSONResponse(w, http.StatusOK, resp)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	user, err := h.authService.GetUserByID(userID)
	if err != nil {
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

	user, err := h.authService.UpdateProfile(userID, req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "name and username are required" {
			status = http.StatusBadRequest
		} else if err.Error() == "username already taken" {
			status = http.StatusConflict
		} else if err.Error() == "user not found" {
			status = http.StatusNotFound
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusOK, user)
}

func (h *AuthHandler) GetUserByUsername(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")

	user, err := h.authService.GetUserByUsername(username)
	if err != nil {
		JSONError(w, "user not found", http.StatusNotFound)
		return
	}

	JSONResponse(w, http.StatusOK, user.ToPublic())
}

func (h *AuthHandler) GetUserByUUID(w http.ResponseWriter, r *http.Request) {
	uuid := chi.URLParam(r, "uuid")

	user, err := h.authService.GetUserByUUID(uuid)
	if err != nil {
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

	users, err := h.authService.ListPublicUsers(limit)
	if err != nil {
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
