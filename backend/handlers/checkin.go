package handlers

import (
	"net/http"
	"time"

	"youpace/config"
	"youpace/models"

	"github.com/labstack/echo/v4"
)

type CheckInRequest struct {
	EnergyLevel    int    `json:"energyLevel" validate:"required,min=1,max=5"`
	EmotionalState int    `json:"emotionalState" validate:"required,min=1,max=5"`
	Notes          string `json:"notes"`
}

func CheckIn(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var req CheckInRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if req.EnergyLevel < 1 || req.EnergyLevel > 5 || req.EmotionalState < 1 || req.EmotionalState > 5 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "energyLevel and emotionalState must be between 1 and 5"})
	}

	// Calculate adjusted intensity based on energy level
	adjustedIntensity := "MODERATE"
	if req.EnergyLevel <= 2 {
		adjustedIntensity = "LIGHT"
	} else if req.EnergyLevel >= 5 {
		adjustedIntensity = "INTENSE"
	}

	today := time.Now().UTC()
	todayDateStr := today.Format("2006-01-02")
	parsedToday, _ := time.Parse("2006-01-02", todayDateStr)

	// Check if already checked in today
	var checkIn models.EmotionalCheckIn
	err = config.DB.Where("user_id = ? AND checkin_date = ?", userID, parsedToday).First(&checkIn).Error

	if err == nil {
		// Update existing
		checkIn.EnergyLevel = req.EnergyLevel
		checkIn.EmotionalState = req.EmotionalState
		checkIn.Notes = req.Notes
		checkIn.AdjustedIntensity = adjustedIntensity
		if err := config.DB.Save(&checkIn).Error; err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update check-in"})
		}
	} else {
		// Create new
		checkIn = models.EmotionalCheckIn{
			UserID:            userID,
			CheckinDate:       parsedToday,
			EnergyLevel:       req.EnergyLevel,
			EmotionalState:    req.EmotionalState,
			Notes:             req.Notes,
			AdjustedIntensity: adjustedIntensity,
		}
		if err := config.DB.Create(&checkIn).Error; err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to save check-in"})
		}
	}

	return c.JSON(http.StatusOK, checkIn)
}

func GetTodayCheckIn(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	today := time.Now().UTC()
	todayDateStr := today.Format("2006-01-02")
	parsedToday, _ := time.Parse("2006-01-02", todayDateStr)

	var checkIn models.EmotionalCheckIn
	if err := config.DB.Where("user_id = ? AND checkin_date = ?", userID, parsedToday).First(&checkIn).Error; err != nil {
		return c.JSON(http.StatusNoContent, nil)
	}

	return c.JSON(http.StatusOK, checkIn)
}

func GetCheckInHistory(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var history []models.EmotionalCheckIn
	if err := config.DB.Where("user_id = ?", userID).Order("checkin_date desc").Find(&history).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve check-in history"})
	}

	return c.JSON(http.StatusOK, history)
}
