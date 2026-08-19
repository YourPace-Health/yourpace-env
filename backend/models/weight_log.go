package models

import (
	"time"

	"github.com/google/uuid"
)

type WeightLog struct {
	LogID             uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"logId"`
	UserID            uuid.UUID `gorm:"type:uuid;index;not null" json:"userId"`
	Weight            float64   `gorm:"type:decimal(5,2);not null" json:"weight"`
	BodyFatPercentage float64   `gorm:"type:decimal(4,1)" json:"bodyFatPercentage"`
	LogDate           time.Time `gorm:"type:date;not null" json:"logDate"`
	Notes             string    `gorm:"type:text" json:"notes"`
	CreatedAt         time.Time `json:"createdAt"`
}
