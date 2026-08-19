package handlers

import (
	"net/http"
	"strings"

	"youpace/config"
	"youpace/models"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

func GetAllExercises(c echo.Context) error {
	var exercises []models.Exercise
	if err := config.DB.Find(&exercises).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve exercises"})
	}
	return c.JSON(http.StatusOK, exercises)
}

func GetSuggestedExercises(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var allExercises []models.Exercise
	if err := config.DB.Find(&allExercises).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve exercises"})
	}

	userEquipStr := strings.ToLower(user.EquipmentOwned)
	if userEquipStr == "" {
		userEquipStr = "bodyweight"
	}

	userEquipments := []string{}
	parts := strings.Split(userEquipStr, ",")
	for _, p := range parts {
		userEquipments = append(userEquipments, strings.TrimSpace(p))
	}

	// Always default helper equipments
	hasBodyweight := false
	hasNoEquipment := false
	for _, eq := range userEquipments {
		if eq == "bodyweight" {
			hasBodyweight = true
		}
		if eq == "no equipment" || eq == "none" {
			hasNoEquipment = true
		}
	}
	if !hasBodyweight {
		userEquipments = append(userEquipments, "bodyweight")
	}
	if !hasNoEquipment {
		userEquipments = append(userEquipments, "no equipment", "none")
	}

	var suggested []models.Exercise
	for _, ex := range allExercises {
		reqEquipStr := strings.ToLower(ex.EquipmentNeeded)
		if reqEquipStr == "" {
			suggested = append(suggested, ex)
			continue
		}

		reqEquipments := []string{}
		rParts := strings.Split(reqEquipStr, ",")
		for _, rp := range rParts {
			reqEquipments = append(reqEquipments, strings.TrimSpace(rp))
		}

		// If any required tool matches user owned tools, suggest it
		matched := false
		for _, re := range reqEquipments {
			for _, ue := range userEquipments {
				if re == ue {
					matched = true
					break
				}
			}
			if matched {
				break
			}
		}

		if matched {
			suggested = append(suggested, ex)
		}
	}

	return c.JSON(http.StatusOK, suggested)
}

func GetFavExercises(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var favs []models.FavExercise
	if err := config.DB.Preload("Exercise").Where("user_id = ?", userID).Find(&favs).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve favorite exercises"})
	}

	var exercises []models.Exercise
	for _, f := range favs {
		exercises = append(exercises, f.Exercise)
	}

	return c.JSON(http.StatusOK, exercises)
}

func AddFavExercise(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	exerciseIDStr := c.Param("id")
	exerciseID, err := uuid.Parse(exerciseIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid exercise ID"})
	}

	// Verify exercise exists
	var exercise models.Exercise
	if err := config.DB.First(&exercise, exerciseID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "exercise not found"})
	}

	// Verify if already favorited
	var existing models.FavExercise
	if err := config.DB.Where("user_id = ? AND exercise_id = ?", userID, exerciseID).First(&existing).Error; err == nil {
		return c.JSON(http.StatusOK, map[string]string{"message": "exercise already in favorites"})
	}

	fav := models.FavExercise{
		UserID:     userID,
		ExerciseID: exerciseID,
	}

	if err := config.DB.Create(&fav).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to save favorite exercise"})
	}

	return c.JSON(http.StatusCreated, map[string]string{"message": "exercise added to favorites"})
}

func RemoveFavExercise(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	exerciseIDStr := c.Param("id")
	exerciseID, err := uuid.Parse(exerciseIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid exercise ID"})
	}

	var fav models.FavExercise
	if err := config.DB.Where("user_id = ? AND exercise_id = ?", userID, exerciseID).First(&fav).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "favorite record not found"})
	}

	if err := config.DB.Delete(&fav).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to remove favorite exercise"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "exercise removed from favorites"})
}
