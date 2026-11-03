package models

import (
	"time"

	"github.com/google/uuid"
)

type Milestone struct {
	MilestoneID   uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"milestoneId"`
	UserID        uuid.UUID `gorm:"type:uuid;index;not null" json:"userId"`
	Title         string    `gorm:"type:varchar(255);not null" json:"title"` // e.g., "First Week Completed"
	Description   string    `gorm:"type:text" json:"description"`
	DateAchieved  time.Time `gorm:"type:date;not null" json:"dateAchieved"`
	MilestoneType string    `gorm:"type:varchar(100);not null" json:"milestoneType"` // STREAK, WEIGHT, WORKOUT_COUNT
	CreatedAt     time.Time `json:"createdAt"`
}
