package models

import (
	"time"

	"github.com/google/uuid"
)

type WorkoutSchedule struct {
	ScheduleID      uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"scheduleId"`
	UserID          uuid.UUID `gorm:"type:uuid;index;not null" json:"userId"`
	Title           string    `gorm:"type:varchar(255);not null" json:"title"` // e.g., "Full Body Workout"
	ScheduledDate   time.Time `gorm:"type:date;not null" json:"scheduledDate"`
	DurationMinutes int       `json:"durationMinutes"`
	Status          string    `gorm:"type:varchar(50);default:'PENDING'" json:"status"` // PENDING, COMPLETED, MISSED, RESCHEDULED
	TargetIntensity string    `gorm:"type:varchar(50)" json:"targetIntensity"`          // LIGHT, MODERATE, INTENSE
	BurnedCalories  float64   `json:"burnedCalories"`

	// Relations
	Details   []WorkoutScheduleDetail `gorm:"foreignKey:WorkoutScheduleID;constraint:OnDelete:CASCADE" json:"details,omitempty"`
	CreatedAt time.Time               `json:"createdAt"`
	UpdatedAt time.Time               `json:"updatedAt"`
}

type WorkoutScheduleDetail struct {
	DetailID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"detailId"`
	WorkoutScheduleID uuid.UUID `gorm:"type:uuid;index;not null" json:"workoutScheduleId"`
	ExerciseID        uuid.UUID `gorm:"type:uuid;not null" json:"exerciseId"`
	Sets              int       `json:"sets"`
	Reps              int       `json:"reps"`
	DurationSeconds   int       `json:"durationSeconds"`

	// Relations
	Exercise Exercise `json:"exercise,omitempty"`
}
