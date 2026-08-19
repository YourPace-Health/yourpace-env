package handlers

import (
	"net/http"
	"time"

	"youpace/config"
	"youpace/models"
	"youpace/services"

	"github.com/labstack/echo/v4"
)

type CreateHealthLogRequest struct {
	LogDate              *time.Time `json:"logDate"`
	Weight               float64    `json:"weight"`
	Height               float64    `json:"height"`
	BodyFatPercentage    float64    `json:"bodyFatPercentage"`
	MuscleMassPercentage float64    `json:"muscleMassPercentage"`
	Notes                string     `json:"notes"`
}

// LogHealthMetric handles recording a new health snapshot (Weight, BMI, Body Fat, etc.)
func LogHealthMetric(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	var req CreateHealthLogRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if req.Weight <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "weight must be greater than 0"})
	}

	var user models.User
	if err := config.DB.Where("user_id = ?", userID).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	// Default height from profile if not provided in log request
	height := req.Height
	if height <= 0 {
		height = user.Height
	}

	bmi, _, _ := services.CalculateBMI(height, req.Weight)

	logDate := time.Now()
	if req.LogDate != nil && !req.LogDate.IsZero() {
		logDate = *req.LogDate
	}

	logEntry := models.UserHealthLog{
		UserID:               userID,
		LogDate:              logDate,
		Weight:               req.Weight,
		Height:               height,
		BMI:                  bmi,
		BodyFatPercentage:    req.BodyFatPercentage,
		MuscleMassPercentage: req.MuscleMassPercentage,
		Notes:                req.Notes,
	}

	if err := config.DB.Create(&logEntry).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to save health log entry"})
	}

	// Sync current user weight in User profile
	user.Weight = req.Weight
	if req.Height > 0 {
		user.Height = req.Height
	}
	config.DB.Save(&user)

	return c.JSON(http.StatusCreated, logEntry)
}

// GetHealthLogsHistory retrieves historic health logs for trend analysis
func GetHealthLogsHistory(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	var logs []models.UserHealthLog
	if err := config.DB.Where("user_id = ?", userID).Order("log_date desc").Find(&logs).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to fetch health logs"})
	}

	return c.JSON(http.StatusOK, logs)
}

// GetHealthSummaryEndpoint returns pure calculated health metrics summary
func GetHealthSummaryEndpoint(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	var user models.User
	if err := config.DB.Where("user_id = ?", userID).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	summary := services.ComputeHealthSummary(&user)
	return c.JSON(http.StatusOK, summary)
}
