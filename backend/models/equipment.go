package models

import (
	"time"

	"github.com/google/uuid"
)

type Equipment struct {
	EquipmentID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"equipmentId"`
	Name        string    `gorm:"type:varchar(255);not null;uniqueIndex" json:"name"`
	DisplayName string    `gorm:"type:varchar(255);not null" json:"displayName"`
	Icon        string    `gorm:"type:varchar(100)" json:"icon"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
