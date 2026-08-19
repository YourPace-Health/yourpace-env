package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	UserID              uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"userId"`
	Username            string         `gorm:"type:varchar(255);not null" json:"username"`
	PasswordHash        string         `gorm:"type:varchar(255)" json:"-"`
	DOB                 *time.Time     `json:"dob"`
	Email               string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	EmailConfirm        bool           `gorm:"default:false" json:"emailConfirm"`
	RefreshToken        string         `gorm:"type:varchar(512)" json:"-"`
	
	// Health Profile Attributes
	Age                 int            `json:"age"`
	Gender              string         `gorm:"type:varchar(50)" json:"gender"`
	Height              float64        `json:"height"`
	Weight              float64        `json:"weight"`
	FitnessGoal         string         `gorm:"type:varchar(100)" json:"fitnessGoal"`         // LOSE_WEIGHT, GAIN_MUSCLE, MAINTAIN_HEALTH, IMPROVE_ENDURANCE
	ActivityLevel       string         `gorm:"type:varchar(50);default:'MODERATELY_ACTIVE'" json:"activityLevel"` // SEDENTARY, LIGHTLY_ACTIVE, MODERATELY_ACTIVE, VERY_ACTIVE, EXTRA_ACTIVE
	TargetWeight        float64        `json:"targetWeight"`
	TargetDate          *time.Time     `json:"targetDate"`
	TargetCalories      int            `json:"targetCalories"`                               // Custom daily target or calculated if 0
	TargetProtein       float64        `json:"targetProtein"`                                // Daily target protein in grams
	TargetCarbs         float64        `json:"targetCarbs"`                                  // Daily target carbs in grams
	TargetFat           float64        `json:"targetFat"`                                    // Daily target fat in grams
	TargetWaterIntakeMl int            `json:"targetWaterIntakeMl"`                          // Custom water intake target or calculated
	DietaryPreference   string         `gorm:"type:varchar(50);default:'BALANCED'" json:"dietaryPreference"` // BALANCED, HIGH_PROTEIN, KETO, VEGETARIAN, VEGAN, LOW_CARB
	HealthConditions    string         `gorm:"type:text" json:"healthConditions"`            // Medical conditions or health alerts
	PreferredWorkoutDays string        `gorm:"type:varchar(100)" json:"preferredWorkoutDays"` // e.g. "MON,WED,FRI"
	PreferredWorkoutTime string        `gorm:"type:varchar(50)" json:"preferredWorkoutTime"`  // e.g. "MORNING", "EVENING"
	EquipmentOwned      string         `gorm:"type:text" json:"equipmentOwned"`              // Comma-separated list
	PhysicalLimitations string         `gorm:"type:text" json:"physicalLimitations"`          // Comma-separated list or notes
	
	CreatedAt           time.Time      `json:"createdAt"`
	UpdatedAt           time.Time      `json:"updatedAt"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`
}

type UserSetting struct {
	UserID                  uuid.UUID `gorm:"type:uuid;primaryKey" json:"userId"`
	NotificationsEnabled    bool      `gorm:"default:true" json:"notificationsEnabled"`
	PushEnabled             bool      `gorm:"default:true" json:"pushEnabled"`
	DefaultRemindDaysBefore int       `gorm:"default:3" json:"defaultRemindDaysBefore"`
	DefaultNotifyTime       string    `gorm:"type:varchar(10);default:'09:00'" json:"defaultNotifyTime"` // "HH:MM"
	Timezone                string    `gorm:"type:varchar(64);default:'Asia/Bangkok'" json:"timezone"`
	Skills                  string    `gorm:"type:text" json:"skills"`
	
	CreatedAt               time.Time `json:"createdAt"`
	UpdatedAt               time.Time `json:"updatedAt"`
}
