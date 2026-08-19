package handlers

import (
	"net/http"

	"youpace/config"
	"youpace/models"

	"github.com/labstack/echo/v4"
)

type DashboardSummary struct {
	TotalCaloriesBurned float64                  `json:"totalCaloriesBurned"`
	TotalDurationMins   int                      `json:"totalDurationMinutes"`
	TotalWorkouts       int64                    `json:"totalWorkouts"`
	CompletedWorkouts   int64                    `json:"completedWorkouts"`
	CompletionRate      float64                  `json:"completionRate"`
	LatestCheckIn       *models.EmotionalCheckIn `json:"latestCheckIn"`
	LatestMealLog       *models.MealLog          `json:"latestMealLog"`
}

func GetDashboardSummary(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var totalCalories float64
	config.DB.Model(&models.WorkoutSchedule{}).
		Where("user_id = ? AND status = 'COMPLETED'", userID).
		Select("COALESCE(SUM(burned_calories), 0)").
		Row().Scan(&totalCalories)

	var totalDuration int
	config.DB.Model(&models.WorkoutSchedule{}).
		Where("user_id = ? AND status = 'COMPLETED'", userID).
		Select("COALESCE(SUM(duration_minutes), 0)").
		Row().Scan(&totalDuration)

	var totalWorkouts int64
	config.DB.Model(&models.WorkoutSchedule{}).Where("user_id = ?", userID).Count(&totalWorkouts)

	var completedWorkouts int64
	config.DB.Model(&models.WorkoutSchedule{}).Where("user_id = ? AND status = 'COMPLETED'", userID).Count(&completedWorkouts)

	var completionRate float64 = 0.0
	if totalWorkouts > 0 {
		completionRate = (float64(completedWorkouts) / float64(totalWorkouts)) * 100.0
	}

	// Latest Check-In
	var latestCheckIn models.EmotionalCheckIn
	var latestCheckInPtr *models.EmotionalCheckIn = nil
	if err := config.DB.Where("user_id = ?", userID).Order("checkin_date desc").First(&latestCheckIn).Error; err == nil {
		latestCheckInPtr = &latestCheckIn
	}

	// Latest Meal Log
	var latestMeal models.MealLog
	var latestMealPtr *models.MealLog = nil
	if err := config.DB.Where("user_id = ?", userID).Order("log_date desc").First(&latestMeal).Error; err == nil {
		latestMealPtr = &latestMeal
	}

	summary := DashboardSummary{
		TotalCaloriesBurned: totalCalories,
		TotalDurationMins:   totalDuration,
		TotalWorkouts:       totalWorkouts,
		CompletedWorkouts:   completedWorkouts,
		CompletionRate:      completionRate,
		LatestCheckIn:       latestCheckInPtr,
		LatestMealLog:       latestMealPtr,
	}

	return c.JSON(http.StatusOK, summary)
}
