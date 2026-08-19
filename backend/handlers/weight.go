package handlers

import (
	"net/http"
	"time"

	"youpace/config"
	"youpace/models"

	"github.com/labstack/echo/v4"
)

type LogWeightRequest struct {
	Weight            float64 `json:"weight" validate:"required"`
	BodyFatPercentage float64 `json:"bodyFatPercentage"`
	LogDate           string  `json:"logDate"`
	Notes             string  `json:"notes"`
}

// LogWeight records a weight entry and updates user's current weight in profile
func LogWeight(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var req LogWeightRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if req.Weight <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "weight must be greater than 0"})
	}

	logDate := time.Now()
	if req.LogDate != "" {
		if parsed, err := time.Parse("2006-01-02", req.LogDate); err == nil {
			logDate = parsed
		}
	}

	weightLog := models.WeightLog{
		UserID:            userID,
		Weight:            req.Weight,
		BodyFatPercentage: req.BodyFatPercentage,
		LogDate:           logDate,
		Notes:             req.Notes,
	}

	if err := config.DB.Create(&weightLog).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to record weight log"})
	}

	// Update user's current weight in User profile
	config.DB.Model(&models.User{}).Where("user_id = ?", userID).Update("weight", req.Weight)

	// Check milestones (e.g. weight milestone)
	go checkForMilestones(userID)

	return c.JSON(http.StatusCreated, weightLog)
}

// GetWeightHistory retrieves weight logs for user
func GetWeightHistory(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var logs []models.WeightLog
	if err := config.DB.Where("user_id = ?", userID).Order("log_date asc").Find(&logs).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve weight history"})
	}

	return c.JSON(http.StatusOK, logs)
}
