package models

import (
	"time"

	"github.com/google/uuid"
)

type Exercise struct {
	ExerciseID      uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"exerciseId"`
	Name            string    `gorm:"type:varchar(255);not null" json:"name"`
	Description     string    `gorm:"type:text" json:"description"`
	MuscleGroup     string    `gorm:"type:varchar(100)" json:"muscleGroup"`     // Chest, Legs, Back, Core, Full Body, etc.
	EquipmentNeeded string    `gorm:"type:text" json:"equipmentNeeded"`         // Comma separated
	BurnRate        float64   `json:"burnRate"`                                 // Calories burned per minute
	DifficultyLevel string    `gorm:"type:varchar(50)" json:"difficultyLevel"` // BEGINNER, INTERMEDIATE, ADVANCED
	VideoURL        string    `gorm:"type:varchar(512)" json:"videoUrl"`
	ImageURL        string    `gorm:"type:varchar(512)" json:"imageUrl"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type FavExercise struct {
	FavID      uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"favId"`
	UserID     uuid.UUID `gorm:"type:uuid;index;not null" json:"userId"`
	ExerciseID uuid.UUID `gorm:"type:uuid;index;not null" json:"exerciseId"`
	
	// Relations
	Exercise   Exercise  `gorm:"constraint:OnDelete:CASCADE" json:"exercise,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}
