package handlers

import (
	"net/http"
	"time"

	"youpace/config"
	"youpace/models"
	"youpace/services"

	"github.com/labstack/echo/v4"
)

type WaterLogResponse struct {
	LogID          string    `json:"logId"`
	UserID         string    `json:"userId"`
	LogDate        string    `json:"logDate"`
	Glasses        int       `json:"glasses"`
	AmountMl       int       `json:"amountMl"`
	TargetGlasses  int       `json:"targetGlasses"`
	TargetAmountMl int       `json:"targetAmountMl"`
	Percentage     float64   `json:"percentage"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type UpdateWaterLogRequest struct {
	Glasses  *int `json:"glasses"`
	AmountMl *int `json:"amountMl"`
}

// GetTodayWaterLog retrieves or initializes today's water intake record
func GetTodayWaterLog(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	today := time.Now().Format("2006-01-02")
	var waterLog models.WaterLog

	err = config.DB.Where("user_id = ? AND log_date = ?", userID, today).First(&waterLog).Error
	if err != nil {
		// Not found, find user target water intake
		var user models.User
		config.DB.Where("user_id = ?", userID).First(&user)

		targetMl := user.TargetWaterIntakeMl
		if targetMl <= 0 {
			// Compute fallback from health calculator or default to 2500 ml
			if user.Weight > 0 {
				targetMl = services.CalculateWaterIntake(user.Weight, user.ActivityLevel)
			} else {
				targetMl = 2500
			}
		}

		targetGlasses := targetMl / 250
		if targetGlasses <= 0 {
			targetGlasses = 10
		}

		waterLog = models.WaterLog{
			UserID:         userID,
			LogDate:        time.Now(),
			Glasses:        0,
			AmountMl:       0,
			TargetGlasses:  targetGlasses,
			TargetAmountMl: targetMl,
		}
		config.DB.Create(&waterLog)
	}

	var pct float64 = 0.0
	if waterLog.TargetGlasses > 0 {
		pct = (float64(waterLog.Glasses) / float64(waterLog.TargetGlasses)) * 100.0
		if pct > 100.0 {
			pct = 100.0
		}
	}

	res := WaterLogResponse{
		LogID:          waterLog.LogID.String(),
		UserID:         waterLog.UserID.String(),
		LogDate:        today,
		Glasses:        waterLog.Glasses,
		AmountMl:       waterLog.AmountMl,
		TargetGlasses:  waterLog.TargetGlasses,
		TargetAmountMl: waterLog.TargetAmountMl,
		Percentage:     pct,
		UpdatedAt:      waterLog.UpdatedAt,
	}

	return c.JSON(http.StatusOK, res)
}

// UpdateTodayWaterLog updates the number of glasses or amount in ml for today
func UpdateTodayWaterLog(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	var req UpdateWaterLogRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	today := time.Now().Format("2006-01-02")
	var waterLog models.WaterLog

	err = config.DB.Where("user_id = ? AND log_date = ?", userID, today).First(&waterLog).Error
	if err != nil {
		// Initialize record if missing
		var user models.User
		config.DB.Where("user_id = ?", userID).First(&user)

		targetMl := user.TargetWaterIntakeMl
		if targetMl <= 0 {
			targetMl = 2500
		}
		targetGlasses := targetMl / 250
		if targetGlasses <= 0 {
			targetGlasses = 10
		}

		waterLog = models.WaterLog{
			UserID:         userID,
			LogDate:        time.Now(),
			TargetGlasses:  targetGlasses,
			TargetAmountMl: targetMl,
		}
	}

	if req.Glasses != nil {
		g := *req.Glasses
		if g < 0 {
			g = 0
		}
		waterLog.Glasses = g
		waterLog.AmountMl = g * 250
	} else if req.AmountMl != nil {
		ml := *req.AmountMl
		if ml < 0 {
			ml = 0
		}
		waterLog.AmountMl = ml
		waterLog.Glasses = ml / 250
	}

	if waterLog.LogID.String() == "00000000-0000-0000-0000-000000000000" || waterLog.CreatedAt.IsZero() {
		config.DB.Create(&waterLog)
	} else {
		config.DB.Save(&waterLog)
	}

	var pct float64 = 0.0
	if waterLog.TargetGlasses > 0 {
		pct = (float64(waterLog.Glasses) / float64(waterLog.TargetGlasses)) * 100.0
		if pct > 100.0 {
			pct = 100.0
		}
	}

	res := WaterLogResponse{
		LogID:          waterLog.LogID.String(),
		UserID:         waterLog.UserID.String(),
		LogDate:        today,
		Glasses:        waterLog.Glasses,
		AmountMl:       waterLog.AmountMl,
		TargetGlasses:  waterLog.TargetGlasses,
		TargetAmountMl: waterLog.TargetAmountMl,
		Percentage:     pct,
		UpdatedAt:      waterLog.UpdatedAt,
	}

	return c.JSON(http.StatusOK, res)
}

// GetWaterLogHistory retrieves historic daily water intake logs
func GetWaterLogHistory(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	var logs []models.WaterLog
	if err := config.DB.Where("user_id = ?", userID).Order("log_date desc").Limit(30).Find(&logs).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to fetch water history"})
	}

	return c.JSON(http.StatusOK, logs)
}
