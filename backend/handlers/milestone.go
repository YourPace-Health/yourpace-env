package handlers

import (
	"net/http"

	"youpace/config"
	"youpace/models"

	"github.com/labstack/echo/v4"
)

func GetMilestones(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var milestones []models.Milestone
	if err := config.DB.Where("user_id = ?", userID).Order("date_achieved desc").Find(&milestones).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve milestones"})
	}

	return c.JSON(http.StatusOK, milestones)
}
