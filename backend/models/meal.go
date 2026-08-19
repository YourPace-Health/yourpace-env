package models

import (
	"time"

	"github.com/google/uuid"
)

type MealLog struct {
	MealID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"mealId"`
	UserID          uuid.UUID `gorm:"type:uuid;index;not null" json:"userId"`
	LogDate         time.Time `json:"logDate"`
	MealType        string    `gorm:"type:varchar(50);default:'LUNCH'" json:"mealType"` // BREAKFAST, LUNCH, DINNER, SNACK
	MealDescription string    `gorm:"type:text;not null" json:"mealDescription"`         // e.g., "ข้าวกะเพราอกไก่ไข่ดาว"
	Calories        float64   `gorm:"default:0" json:"calories"`
	Protein         float64   `gorm:"default:0" json:"protein"`
	Carbs           float64   `gorm:"default:0" json:"carbs"`
	Fat             float64   `gorm:"default:0" json:"fat"`
	HealthScore     int       `gorm:"default:75" json:"healthScore"`                    // 1-100
	AISummary       string    `gorm:"type:text" json:"aiSummary"`                        // AI nutrition breakdown and tips
	CreatedAt       time.Time `json:"createdAt"`
}
