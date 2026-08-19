package models

import (
	"time"

	"github.com/google/uuid"
)

type UserGoogleToken struct {
	UserID       uuid.UUID `gorm:"type:uuid;primaryKey" json:"userId"`
	AccessToken  string    `gorm:"type:text;not null" json:"accessToken"`
	RefreshToken string    `gorm:"type:text;not null" json:"refreshToken"`
	Expiry       time.Time `json:"expiry"`
	TokenType    string    `gorm:"type:varchar(50)" json:"tokenType"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}
