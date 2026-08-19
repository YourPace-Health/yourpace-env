package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"youpace/config"
	"youpace/models"
	"youpace/services"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type UserProfileResponse struct {
	UserID               uuid.UUID                      `json:"userId"`
	Username             string                         `json:"username"`
	Email                string                         `json:"email"`
	Age                  int                            `json:"age"`
	Gender               string                         `json:"gender"`
	Height               float64                        `json:"height"`
	Weight               float64                        `json:"weight"`
	FitnessGoal          string                         `json:"fitnessGoal"`
	ActivityLevel        string                         `json:"activityLevel"`
	TargetWeight         float64                        `json:"targetWeight"`
	TargetDate           *time.Time                     `json:"targetDate"`
	TargetCalories       int                            `json:"targetCalories"`
	TargetProtein        float64                        `json:"targetProtein"`
	TargetCarbs          float64                        `json:"targetCarbs"`
	TargetFat            float64                        `json:"targetFat"`
	TargetWaterIntakeMl  int                            `json:"targetWaterIntakeMl"`
	DietaryPreference    string                         `json:"dietaryPreference"`
	HealthConditions     string                         `json:"healthConditions"`
	PreferredWorkoutDays string                         `json:"preferredWorkoutDays"`
	PreferredWorkoutTime string                         `json:"preferredWorkoutTime"`
	EquipmentOwned       []string                       `json:"equipmentOwned"`
	PhysicalLimitations  []string                       `json:"physicalLimitations"`
	HealthSummary        services.ComputedHealthSummary `json:"healthSummary"`
}

type UpdateProfileRequest struct {
	Age                  int             `json:"age"`
	Gender               string          `json:"gender"`
	Height               float64         `json:"height"`
	Weight               float64         `json:"weight"`
	FitnessGoal          string          `json:"fitnessGoal"`
	ActivityLevel        string          `json:"activityLevel"`
	TargetWeight         float64         `json:"targetWeight"`
	TargetDate           json.RawMessage `json:"targetDate"`
	TargetCalories       int             `json:"targetCalories"`
	TargetProtein        float64         `json:"targetProtein"`
	TargetCarbs          float64         `json:"targetCarbs"`
	TargetFat            float64         `json:"targetFat"`
	TargetWaterIntakeMl  int             `json:"targetWaterIntakeMl"`
	DietaryPreference    string          `json:"dietaryPreference"`
	HealthConditions     string          `json:"healthConditions"`
	PreferredWorkoutDays string          `json:"preferredWorkoutDays"`
	PreferredWorkoutTime string          `json:"preferredWorkoutTime"`
	EquipmentOwned       []string        `json:"equipmentOwned"`
	PhysicalLimitations  []string        `json:"physicalLimitations"`
}

func GetUserProfile(c echo.Context) error {
	email := c.Get("email").(string)

	var user models.User
	if err := config.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	equipments := []string{}
	if user.EquipmentOwned != "" {
		parts := strings.Split(user.EquipmentOwned, ",")
		for _, p := range parts {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				equipments = append(equipments, trimmed)
			}
		}
	}

	limitations := []string{}
	if user.PhysicalLimitations != "" {
		parts := strings.Split(user.PhysicalLimitations, ",")
		for _, p := range parts {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				limitations = append(limitations, trimmed)
			}
		}
	}

	healthSummary := services.ComputeHealthSummary(&user)

	res := UserProfileResponse{
		UserID:               user.UserID,
		Username:             user.Username,
		Email:                user.Email,
		Age:                  user.Age,
		Gender:               user.Gender,
		Height:               user.Height,
		Weight:               user.Weight,
		FitnessGoal:          user.FitnessGoal,
		ActivityLevel:        user.ActivityLevel,
		TargetWeight:         user.TargetWeight,
		TargetDate:           user.TargetDate,
		TargetCalories:       user.TargetCalories,
		TargetProtein:        user.TargetProtein,
		TargetCarbs:          user.TargetCarbs,
		TargetFat:            user.TargetFat,
		TargetWaterIntakeMl:  user.TargetWaterIntakeMl,
		DietaryPreference:    user.DietaryPreference,
		HealthConditions:     user.HealthConditions,
		PreferredWorkoutDays: user.PreferredWorkoutDays,
		PreferredWorkoutTime: user.PreferredWorkoutTime,
		EquipmentOwned:       equipments,
		PhysicalLimitations:  limitations,
		HealthSummary:        healthSummary,
	}

	return c.JSON(http.StatusOK, res)
}

func UpdateUserProfile(c echo.Context) error {
	email := c.Get("email").(string)

	var req UpdateProfileRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	var user models.User
	if err := config.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	previousWeight := user.Weight

	// Validation
	if req.Age < 0 || req.Age > 120 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid age (must be between 0 and 120)"})
	}
	if req.Height < 0 || req.Height > 300 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid height (must be between 0 and 300 cm)"})
	}
	if req.Weight < 0 || req.Weight > 500 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid weight (must be between 0 and 500 kg)"})
	}

	user.Age = req.Age
	user.Gender = req.Gender
	user.Height = req.Height
	user.Weight = req.Weight
	user.FitnessGoal = req.FitnessGoal
	if req.ActivityLevel != "" {
		user.ActivityLevel = req.ActivityLevel
	}
	user.TargetWeight = req.TargetWeight
	if len(req.TargetDate) > 0 {
		var dateStr string
		if err := json.Unmarshal(req.TargetDate, &dateStr); err == nil && dateStr != "" {
			formats := []string{
				time.RFC3339,
				"2006-01-02T15:04:05.000Z",
				"2006-01-02T15:04:05Z",
				"2006-01-02",
			}
			var parsedTime *time.Time
			for _, f := range formats {
				if parsed, err := time.Parse(f, dateStr); err == nil {
					parsedTime = &parsed
					break
				}
			}
			user.TargetDate = parsedTime
		}
	}
	user.TargetWaterIntakeMl = req.TargetWaterIntakeMl
	if req.DietaryPreference != "" {
		user.DietaryPreference = req.DietaryPreference
	}
	user.HealthConditions = req.HealthConditions
	user.PreferredWorkoutDays = req.PreferredWorkoutDays
	user.PreferredWorkoutTime = req.PreferredWorkoutTime

	// Automatically calculate personalized nutrition targets
	computedSummary := services.ComputeHealthSummary(&user)
	user.TargetCalories = computedSummary.RecommendedCalories
	user.TargetProtein = float64(computedSummary.TargetProteinGrams)
	user.TargetCarbs = float64(computedSummary.TargetCarbsGrams)
	user.TargetFat = float64(computedSummary.TargetFatGrams)

	// Join list to string
	user.EquipmentOwned = strings.Join(req.EquipmentOwned, ",")
	user.PhysicalLimitations = strings.Join(req.PhysicalLimitations, ",")

	if err := config.DB.Save(&user).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update profile"})
	}

	// Auto-create UserHealthLog entry if weight/height updated
	if previousWeight != user.Weight && user.Weight > 0 {
		bmi, _, _ := services.CalculateBMI(user.Height, user.Weight)
		healthLog := models.UserHealthLog{
			UserID:  user.UserID,
			LogDate: time.Now(),
			Weight:  user.Weight,
			Height:  user.Height,
			BMI:     bmi,
			Notes:   "อัปเดตน้ำหนักอัตโนมัติจากโปรไฟล์",
		}
		config.DB.Create(&healthLog)
	}

	return GetUserProfile(c) // Return updated profile with computed health metrics
}

func GetUserSetting(c echo.Context) error {
	email := c.Get("email").(string)

	var user models.User
	if err := config.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var setting models.UserSetting
	if err := config.DB.Where("user_id = ?", user.UserID).First(&setting).Error; err != nil {
		// If not exists, create it
		setting = models.UserSetting{
			UserID: user.UserID,
		}
		config.DB.Create(&setting)
	}

	return c.JSON(http.StatusOK, setting)
}

type UpdateUserSettingRequest struct {
	NotificationsEnabled    bool   `json:"notificationsEnabled"`
	PushEnabled             bool   `json:"pushEnabled"`
	DefaultRemindDaysBefore int    `json:"defaultRemindDaysBefore"`
	DefaultNotifyTime       string `json:"defaultNotifyTime"`
	Timezone                string `json:"timezone"`
	Skills                  string `json:"skills"`
}

func UpdateUserSetting(c echo.Context) error {
	email := c.Get("email").(string)

	var req UpdateUserSettingRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	var user models.User
	if err := config.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var setting models.UserSetting
	if err := config.DB.Where("user_id = ?", user.UserID).First(&setting).Error; err != nil {
		setting.UserID = user.UserID
	}

	setting.NotificationsEnabled = req.NotificationsEnabled
	setting.PushEnabled = req.PushEnabled
	setting.DefaultRemindDaysBefore = req.DefaultRemindDaysBefore
	setting.DefaultNotifyTime = req.DefaultNotifyTime
	setting.Timezone = req.Timezone
	setting.Skills = req.Skills

	if err := config.DB.Save(&setting).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to save setting"})
	}

	return c.JSON(http.StatusOK, setting)
}

func ExtractUserID(c echo.Context) (uuid.UUID, error) {
	email, ok := c.Get("email").(string)
	if !ok || email == "" {
		return uuid.Nil, echo.NewHTTPError(http.StatusUnauthorized, "unauthorized access")
	}
	var user models.User
	if err := config.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return uuid.Nil, err
	}
	return user.UserID, nil
}
