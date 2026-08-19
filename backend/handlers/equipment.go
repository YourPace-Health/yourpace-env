package handlers

import (
	"net/http"
	"youpace/config"
	"youpace/models"

	"github.com/labstack/echo/v4"
)

func GetAllEquipments(c echo.Context) error {
	var equipments []models.Equipment
	if err := config.DB.Order("display_name asc").Find(&equipments).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to load equipments"})
	}
	return c.JSON(http.StatusOK, equipments)
}
