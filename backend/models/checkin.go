package models

import (
	"time"

	"github.com/google/uuid"
)

type EmotionalCheckIn struct {
	CheckinID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"checkinId"`
	UserID            uuid.UUID `gorm:"type:uuid;index;not null" json:"userId"`
	CheckinDate       time.Time `gorm:"type:date;not null" json:"checkinDate"` // Stores date portion
	EnergyLevel       int       `gorm:"not null" json:"energyLevel"`          // 1 to 5
	EmotionalState    int       `gorm:"not null" json:"emotionalState"`       // 1 to 5
	Notes             string    `gorm:"type:text" json:"notes"`
	AdjustedIntensity string    `gorm:"type:varchar(50);not null" json:"adjustedIntensity"` // LIGHT, MODERATE, INTENSE
	CreatedAt         time.Time `json:"createdAt"`
}
