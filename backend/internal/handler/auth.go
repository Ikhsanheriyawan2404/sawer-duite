package handler

import (
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type AuthHandler struct {
	authService    *service.AuthService
	storageService *service.StorageService
}

func NewAuthHandler(authService *service.AuthService, storageService *service.StorageService) *AuthHandler {
	return &AuthHandler{
		authService:    authService,
		storageService: storageService,
	}
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

func (h *AuthHandler) UpdateProfileBasic(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req domain.UpdateProfileBasicRequest
	if !BindJSON(w, r, &req) {
		return
	}

	user, err := h.authService.UpdateProfileBasic(userID, req)
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

func (h *AuthHandler) UpdatePaymentSettings(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req domain.UpdatePaymentRequest
	if !BindJSON(w, r, &req) {
		return
	}

	user, err := h.authService.UpdatePaymentSettings(userID, req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "user not found" {
			status = http.StatusNotFound
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusOK, user)
}

func (h *AuthHandler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req domain.UpdateConfigRequest
	if !BindJSON(w, r, &req) {
		return
	}

	user, err := h.authService.UpdateConfig(userID, req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "user not found" {
			status = http.StatusNotFound
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusOK, user)
}

func (h *AuthHandler) UpdateGoal(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req domain.CreateGoalRequest
	if !BindJSON(w, r, &req) {
		return
	}

	goal, err := h.authService.CreateGoal(userID, req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "title and target_amount are required" || err.Error() == "starts_at must be before ends_at" {
			status = http.StatusBadRequest
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusCreated, goal)
}

func (h *AuthHandler) ListGoals(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	goals, err := h.authService.ListGoals(userID)
	if err != nil {
		JSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	JSONResponse(w, http.StatusOK, goals)
}

func (h *AuthHandler) CreateGoal(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req domain.CreateGoalRequest
	if !BindJSON(w, r, &req) {
		return
	}

	goal, err := h.authService.CreateGoal(userID, req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "title and target_amount are required" || err.Error() == "starts_at must be before ends_at" {
			status = http.StatusBadRequest
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusCreated, goal)
}

func (h *AuthHandler) UpdateGoalByID(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)
	goalIDParam := chi.URLParam(r, "id")
	goalID64, err := strconv.ParseUint(goalIDParam, 10, 64)
	if err != nil {
		JSONError(w, "invalid goal id", http.StatusBadRequest)
		return
	}

	var req domain.UpdateGoalRequest
	if !BindJSON(w, r, &req) {
		return
	}

	goal, err := h.authService.UpdateGoal(userID, uint(goalID64), req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "starts_at must be before ends_at" {
			status = http.StatusBadRequest
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusOK, goal)
}

func (h *AuthHandler) ActivateGoal(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)
	goalIDParam := chi.URLParam(r, "id")
	goalID64, err := strconv.ParseUint(goalIDParam, 10, 64)
	if err != nil {
		JSONError(w, "invalid goal id", http.StatusBadRequest)
		return
	}

	goal, err := h.authService.SetActiveGoal(userID, uint(goalID64))
	if err != nil {
		JSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	JSONResponse(w, http.StatusOK, goal)
}

func (h *AuthHandler) DeleteGoal(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)
	goalIDParam := chi.URLParam(r, "id")
	goalID64, err := strconv.ParseUint(goalIDParam, 10, 64)
	if err != nil {
		JSONError(w, "invalid goal id", http.StatusBadRequest)
		return
	}

	if err := h.authService.DeleteGoal(userID, uint(goalID64)); err != nil {
		JSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	JSONResponse(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *AuthHandler) UpdateAlertConfig(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req domain.UpdateAlertConfigRequest
	if !BindJSON(w, r, &req) {
		return
	}

	user, err := h.authService.UpdateAlertConfig(userID, req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "user not found" {
			status = http.StatusNotFound
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusOK, user)
}

func (h *AuthHandler) UpdateQueueConfig(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req domain.UpdateQueueConfigRequest
	if !BindJSON(w, r, &req) {
		return
	}

	user, err := h.authService.UpdateQueueConfig(userID, req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "user not found" {
			status = http.StatusNotFound
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusOK, user)
}

func (h *AuthHandler) UpdateListConfig(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req domain.UpdateListConfigRequest
	if !BindJSON(w, r, &req) {
		return
	}

	user, err := h.authService.UpdateListConfig(userID, req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "user not found" {
			status = http.StatusNotFound
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusOK, user)
}

func (h *AuthHandler) UpdateMediaConfig(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req domain.UpdateMediaConfigRequest
	if !BindJSON(w, r, &req) {
		return
	}

	user, err := h.authService.UpdateMediaConfig(userID, req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "user not found" {
			status = http.StatusNotFound
		}
		JSONError(w, err.Error(), status)
		return
	}

	JSONResponse(w, http.StatusOK, user)
}

func (h *AuthHandler) UpdateQRConfig(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req domain.UpdateQRConfigRequest
	if !BindJSON(w, r, &req) {
		return
	}

	user, err := h.authService.UpdateQRConfig(userID, req)
	if err != nil {
		JSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	JSONResponse(w, http.StatusOK, user)
}

func (h *AuthHandler) UpdateDonationPackages(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var packages []domain.DonationPackage
	if !BindJSON(w, r, &packages) {
		return
	}

	user, err := h.authService.UpdateDonationPackages(userID, packages)
	if err != nil {
		JSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	JSONResponse(w, http.StatusOK, user)
}

func (h *AuthHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	const maxSize = 2 << 20 // 2MB
	r.Body = http.MaxBytesReader(w, r.Body, maxSize+1024)
	if err := r.ParseMultipartForm(maxSize); err != nil {
		JSONError(w, "file terlalu besar atau format tidak valid", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		JSONError(w, "file avatar tidak ditemukan", http.StatusBadRequest)
		return
	}
	defer file.Close()

	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	contentType := http.DetectContentType(buf[:n])
	if _, err := file.Seek(0, 0); err != nil {
		JSONError(w, "gagal membaca file", http.StatusBadRequest)
		return
	}

	allowed := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
	}
	if !allowed[contentType] {
		JSONError(w, "hanya gambar JPG, PNG, atau WebP yang diperbolehkan", http.StatusBadRequest)
		return
	}
	if header.Size > maxSize {
		JSONError(w, "ukuran maksimal 2MB", http.StatusBadRequest)
		return
	}

	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		JSONError(w, "user not found", http.StatusNotFound)
		return
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
    switch contentType {
    case "image/png":
      ext = ".png"
    case "image/webp":
      ext = ".webp"
    default:
      ext = ".jpg"
    }
	}
	fileName := "avatars/" + user.UUID + "-" + strconv.FormatInt(time.Now().UnixNano(), 10) + ext

	publicURL, err := h.storageService.UploadPublicObject(fileName, file, header.Size, contentType)
	if err != nil {
		JSONError(w, "gagal upload avatar", http.StatusInternalServerError)
		return
	}

	updated, err := h.authService.UpdateAvatarURL(userID, publicURL)
	if err != nil {
		JSONError(w, "gagal update avatar", http.StatusInternalServerError)
		return
	}

	JSONResponse(w, http.StatusOK, updated)
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
			Name:     user.Profile.Name,
		})
	}

	JSONResponse(w, http.StatusOK, publicUsers)
}
