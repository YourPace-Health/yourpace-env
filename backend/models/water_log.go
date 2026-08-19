package models

import (
	"time"

	"github.com/google/uuid"
)

type WaterLog struct {
	LogID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"logId"`
	UserID        uuid.UUID `gorm:"type:uuid;index;not null" json:"userId"`
	LogDate       time.Time `gorm:"type:date;not null;index:idx_user_water_date,unique" json:"logDate"`
	Glasses       int       `gorm:"default:0" json:"glasses"`
	AmountMl      int       `gorm:"default:0" json:"amountMl"`
	TargetGlasses int       `gorm:"default:10" json:"targetGlasses"`
	TargetAmountMl int      `gorm:"default:2500" json:"targetAmountMl"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
