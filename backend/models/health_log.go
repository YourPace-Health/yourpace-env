package models

import (
	"time"

	"github.com/google/uuid"
)

type UserHealthLog struct {
	LogID                uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"logId"`
	UserID               uuid.UUID `gorm:"type:uuid;index;not null" json:"userId"`
	LogDate              time.Time `gorm:"type:date;not null" json:"logDate"`
	Weight               float64   `gorm:"type:numeric(5,2)" json:"weight"`
	Height               float64   `gorm:"type:numeric(5,2)" json:"height"`
	BMI                  float64   `gorm:"type:numeric(4,2)" json:"bmi"`
	BodyFatPercentage    float64   `gorm:"type:numeric(4,2)" json:"bodyFatPercentage,omitempty"`
	MuscleMassPercentage float64   `gorm:"type:numeric(4,2)" json:"muscleMassPercentage,omitempty"`
	Notes                string    `gorm:"type:text" json:"notes,omitempty"`
	CreatedAt            time.Time `json:"createdAt"`
}
