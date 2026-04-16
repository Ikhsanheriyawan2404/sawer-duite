package repository

import (
	"github.com/Ikhsanheriyawan2404/sawer-duite/backend/internal/domain"
	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *domain.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepository) CreateProfile(p *domain.CreatorProfile) error {
	return r.db.Create(p).Error
}

func (r *UserRepository) CreateConfig(c *domain.DonationConfig) error {
	return r.db.Create(c).Error
}

func (r *UserRepository) CreatePayment(p *domain.PaymentAccount) error {
	return r.db.Create(p).Error
}

func (r *UserRepository) CreateAlertConfig(c *domain.AlertConfig) error {
	return r.db.Create(c).Error
}

func (r *UserRepository) CreateQueueConfig(c *domain.QueueConfig) error {
	return r.db.Create(c).Error
}

func (r *UserRepository) CreateListConfig(c *domain.ListOverlayConfig) error {
	return r.db.Create(c).Error
}

func (r *UserRepository) CreateQRConfig(c *domain.QRConfig) error {
	return r.db.Create(c).Error
}

func (r *UserRepository) CreateMediaConfig(c *domain.MediaOverlayConfig) error {
	return r.db.Create(c).Error
}

func (r *UserRepository) Update(user *domain.User) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Omit associations from the main user save to prevent zero-value inserts/updates
		if err := tx.Omit("Profile", "Config", "Payment", "AlertConfig", "QueueConfig", "ListConfig", "QRConfig", "MediaConfig", "DonationPackages").Save(user).Error; err != nil {
			return err
		}
		// Ensure UserID is set for all relations before saving individually
		user.Profile.UserID = user.ID
		user.Config.UserID = user.ID
		user.Payment.UserID = user.ID
		user.AlertConfig.UserID = user.ID
		user.QueueConfig.UserID = user.ID
		user.ListConfig.UserID = user.ID
		user.QRConfig.UserID = user.ID
		user.MediaConfig.UserID = user.ID

		if err := tx.Save(&user.Profile).Error; err != nil {
			return err
		}
		if err := tx.Save(&user.Config).Error; err != nil {
			return err
		}
		if err := tx.Save(&user.Payment).Error; err != nil {
			return err
		}
		if err := tx.Save(&user.AlertConfig).Error; err != nil {
			return err
		}
		if err := tx.Save(&user.QueueConfig).Error; err != nil {
			return err
		}
		if err := tx.Save(&user.ListConfig).Error; err != nil {
			return err
		}
		if err := tx.Save(&user.QRConfig).Error; err != nil {
			return err
		}
		if err := tx.Save(&user.MediaConfig).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *UserRepository) baseQuery() *gorm.DB {
	return r.db.Preload("Profile").Preload("Config").Preload("Payment").Preload("AlertConfig").Preload("QueueConfig").Preload("ListConfig").Preload("QRConfig").Preload("MediaConfig").Preload("DonationPackages")
}

func (r *UserRepository) ReplaceDonationPackages(userID uint, packages []domain.DonationPackage, category string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ? AND category = ?", userID, category).Delete(&domain.DonationPackage{}).Error; err != nil {
			return err
		}
		for i := range packages {
			packages[i].UserID = userID
			packages[i].Category = category
		}
		if len(packages) == 0 {
			return nil
		}
		return tx.Create(&packages).Error
	})
}

func (r *UserRepository) GetByID(id uint) (*domain.User, error) {
	var user domain.User
	if err := r.baseQuery().First(&user, id).Error; err != nil {
		return nil, err
	}
	r.loadActiveGoal(&user)
	return &user, nil
}

func (r *UserRepository) GetByEmail(email string) (*domain.User, error) {
	var user domain.User
	if err := r.baseQuery().Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByUsername(username string) (*domain.User, error) {
	var user domain.User
	if err := r.baseQuery().Where("username = ?", username).First(&user).Error; err != nil {
		return nil, err
	}
	r.loadActiveGoal(&user)
	return &user, nil
}

func (r *UserRepository) GetByUUID(uuid string) (*domain.User, error) {
	var user domain.User
	if err := r.baseQuery().Where("uuid = ?", uuid).First(&user).Error; err != nil {
		return nil, err
	}
	r.loadActiveGoal(&user)
	return &user, nil
}

func (r *UserRepository) GetByAppToken(token string) (*domain.User, error) {
	var user domain.User
	if err := r.baseQuery().Where("app_token = ?", token).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) loadActiveGoal(u *domain.User) {
	var goal domain.DonationGoal
	if err := r.db.Where("user_id = ? AND is_active = ?", u.ID, true).Order("created_at desc").First(&goal).Error; err == nil {
		if total, err := r.computeGoalCurrentAmount(goal); err == nil {
			goal.CurrentAmount = total
		}
		u.ActiveGoal = &goal
	}
}

func (r *UserRepository) GetActiveGoal(userID uint) (*domain.DonationGoal, error) {
	var goal domain.DonationGoal
	if err := r.db.Where("user_id = ? AND is_active = ?", userID, true).Order("created_at desc").First(&goal).Error; err != nil {
		return nil, err
	}
	if total, err := r.computeGoalCurrentAmount(goal); err == nil {
		goal.CurrentAmount = total
	}
	return &goal, nil
}

func (r *UserRepository) ListPublicUsers(limit int) ([]domain.User, error) {
	var users []domain.User
	if err := r.db.Model(&domain.User{}).
		Preload("Profile").
		Order("created_at asc").
		Limit(limit).
		Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (r *UserRepository) ListGoals(userID uint) ([]domain.DonationGoal, error) {
	var goals []domain.DonationGoal
	if err := r.db.Where("user_id = ?", userID).Order("is_active desc, created_at desc").Find(&goals).Error; err != nil {
		return nil, err
	}
	for i := range goals {
		if total, err := r.computeGoalCurrentAmount(goals[i]); err == nil {
			goals[i].CurrentAmount = total
		}
	}
	return goals, nil
}

func (r *UserRepository) CreateGoal(userID uint, req domain.CreateGoalRequest, isActive bool) (*domain.DonationGoal, error) {
	var goal domain.DonationGoal
	err := r.db.Transaction(func(tx *gorm.DB) error {
		if isActive {
			if err := tx.Model(&domain.DonationGoal{}).Where("user_id = ?", userID).Update("is_active", false).Error; err != nil {
				return err
			}
		}

		goal = domain.DonationGoal{
			UserID:        userID,
			Title:         req.Title,
			TargetAmount:  req.TargetAmount,
			CurrentAmount: 0,
			StartsAt:      req.StartsAt,
			EndsAt:        req.EndsAt,
			IsActive:      isActive,
		}

		return tx.Create(&goal).Error
	})
	if err != nil {
		return nil, err
	}
	return &goal, nil
}

func (r *UserRepository) UpdateGoal(userID uint, goalID uint, req domain.UpdateGoalRequest) (*domain.DonationGoal, error) {
	var goal domain.DonationGoal
	err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND user_id = ?", goalID, userID).First(&goal).Error; err != nil {
			return err
		}

		updates := map[string]any{}
		if req.Title != nil {
			updates["title"] = *req.Title
		}
		if req.TargetAmount != nil {
			updates["target_amount"] = *req.TargetAmount
		}
		if req.StartsAt != nil {
			updates["starts_at"] = req.StartsAt
		}
		if req.EndsAt != nil {
			updates["ends_at"] = req.EndsAt
		}
		if req.ClearStartsAt != nil && *req.ClearStartsAt {
			updates["starts_at"] = nil
		}
		if req.ClearEndsAt != nil && *req.ClearEndsAt {
			updates["ends_at"] = nil
		}
		if req.IsActive != nil {
			if *req.IsActive {
				if err := tx.Model(&domain.DonationGoal{}).Where("user_id = ?", userID).Update("is_active", false).Error; err != nil {
					return err
				}
			}
			updates["is_active"] = *req.IsActive
		}

		if len(updates) > 0 {
			if err := tx.Model(&goal).Updates(updates).Error; err != nil {
				return err
			}
		}

		return tx.First(&goal, goal.ID).Error
	})
	if err != nil {
		return nil, err
	}
	return &goal, nil
}

func (r *UserRepository) SetActiveGoal(userID uint, goalID uint) (*domain.DonationGoal, error) {
	var goal domain.DonationGoal
	err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND user_id = ?", goalID, userID).First(&goal).Error; err != nil {
			return err
		}
		if err := tx.Model(&domain.DonationGoal{}).Where("user_id = ?", userID).Update("is_active", false).Error; err != nil {
			return err
		}
		if err := tx.Model(&goal).Update("is_active", true).Error; err != nil {
			return err
		}
		return tx.First(&goal, goal.ID).Error
	})
	if err != nil {
		return nil, err
	}
	return &goal, nil
}

func (r *UserRepository) DeleteGoal(userID uint, goalID uint) error {
	return r.db.Where("id = ? AND user_id = ?", goalID, userID).Delete(&domain.DonationGoal{}).Error
}

func (r *UserRepository) computeGoalCurrentAmount(goal domain.DonationGoal) (int64, error) {
	query := r.db.Model(&domain.Transaction{}).
		Where("target_id = ? AND status = ?", goal.UserID, "PAID")

	if goal.StartsAt != nil {
		query = query.Where("created_at >= ?", *goal.StartsAt)
	}
	if goal.EndsAt != nil {
		query = query.Where("created_at <= ?", *goal.EndsAt)
	}

	var total int64
	if err := query.Select("COALESCE(SUM(base_amount), 0)").Scan(&total).Error; err != nil {
		return 0, err
	}
	return total, nil
}
