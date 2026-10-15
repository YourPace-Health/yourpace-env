package handlers

import (
	"math"
	"net/http"
	"time"

	"youpace/config"
	"youpace/models"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type DailyStat struct {
	DayName         string  `json:"dayName"` // "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."
	DateStr         string  `json:"dateStr"` // "2026-08-14"
	CaloriesBurned  float64 `json:"caloriesBurned"`
	DurationMinutes int     `json:"durationMinutes"`
	WorkoutCount    int     `json:"workoutCount"`
}

type LevelProgressInfo struct {
	LevelCode          string  `json:"levelCode"`  // "R1", "R2", "R3", "R4", "R5"
	LevelTitle         string  `json:"levelTitle"` // "Beginner Starter", "Active Mover", "Committed Athlete", "Pace Champion", "Elite Legend"
	CurrentEXP         int     `json:"currentExp"`
	NextLevelEXP       int     `json:"nextLevelExp"`
	ProgressPercentage float64 `json:"progressPercentage"`
}

type WeightProgressSummary struct {
	CurrentWeight     float64    `json:"currentWeight"`
	StartWeight       float64    `json:"startWeight"`
	TargetWeight      float64    `json:"targetWeight"`
	TargetDate        *time.Time `json:"targetDate"`
	DaysRemaining     int        `json:"daysRemaining"`
	PaceKgPerWeek     float64    `json:"paceKgPerWeek"`
	WeightChange      float64    `json:"weightChange"`      // Current - Start (Negative means lost weight)
	RemainingToTarget float64    `json:"remainingToTarget"` // Math.abs(Current - Target)
	BMI               float64    `json:"bmi"`
	BMICategory       string     `json:"bmiCategory"`
}

type HeatmapDay struct {
	DateStr      string  `json:"dateStr"`
	WorkoutCount int     `json:"workoutCount"`
	Calories     float64 `json:"calories"`
	Active       bool    `json:"active"`
}

type ProgressAnalyticsResponse struct {
	WeeklyStats            []DailyStat           `json:"weeklyStats"`
	ThisWeekCalories       float64               `json:"thisWeekCalories"`
	LastWeekCalories       float64               `json:"lastWeekCalories"`
	ThisWeekDurationMins   int                   `json:"thisWeekDurationMins"`
	CurrentStreakDays      int                   `json:"currentStreakDays"`
	BestStreakDays         int                   `json:"bestStreakDays"`
	TotalWorkoutsCompleted int64                 `json:"totalWorkoutsCompleted"`
	TotalCaloriesAllTime   float64               `json:"totalCaloriesAllTime"`
	LevelInfo              LevelProgressInfo     `json:"levelInfo"`
	WeightProgress         WeightProgressSummary `json:"weightProgress"`
	ActivityHeatmap        []HeatmapDay          `json:"activityHeatmap"` // 30-day activity map
}

// GetProgressAnalytics calculates full progress & motivation metrics
func GetProgressAnalytics(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	loc, errLoc := time.LoadLocation("Asia/Bangkok")
	if errLoc != nil {
		loc = time.FixedZone("ICT", 7*3600)
	}

	now := time.Now().In(loc)

	var user models.User
	config.DB.First(&user, userID)

	// 1. Calculate All-time Completed Workouts & Calories
	var totalCompleted int64
	config.DB.Model(&models.WorkoutSchedule{}).
		Where("user_id = ? AND status = 'COMPLETED'", userID).
		Count(&totalCompleted)

	var totalCalories float64
	config.DB.Model(&models.WorkoutSchedule{}).
		Where("user_id = ? AND status = 'COMPLETED'", userID).
		Select("COALESCE(SUM(burned_calories), 0)").
		Row().Scan(&totalCalories)

	// 2. Calculate Weekly Stats (Mon - Sun of this current week)
	// Find Monday of this week
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7 // Sunday as 7
	}
	monday := now.AddDate(0, 0, -(weekday - 1))
	mondayStart := time.Date(monday.Year(), monday.Month(), monday.Day(), 0, 0, 0, 0, loc)

	dayNames := []string{"จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."}
	weeklyStats := make([]DailyStat, 7)
	var thisWeekTotalCal float64 = 0.0
	var thisWeekTotalMins int = 0

	for i := 0; i < 7; i++ {
		d := mondayStart.AddDate(0, 0, i)
		dStr := d.Format("2006-01-02")

		var dayCal float64
		var dayMins int
		var dayCount int64

		config.DB.Model(&models.WorkoutSchedule{}).
			Where("user_id = ? AND status = 'COMPLETED' AND DATE(scheduled_date) = ?", userID, dStr).
			Select("COALESCE(SUM(burned_calories), 0), COALESCE(SUM(duration_minutes), 0), COUNT(*)").
			Row().Scan(&dayCal, &dayMins, &dayCount)

		weeklyStats[i] = DailyStat{
			DayName:         dayNames[i],
			DateStr:         dStr,
			CaloriesBurned:  dayCal,
			DurationMinutes: dayMins,
			WorkoutCount:    int(dayCount),
		}

		thisWeekTotalCal += dayCal
		thisWeekTotalMins += dayMins
	}

	// Calculate Last Week Calories
	lastMonday := mondayStart.AddDate(0, 0, -7)
	lastSundayEnd := mondayStart.Add(-time.Nanosecond)
	var lastWeekTotalCal float64 = 0.0
	config.DB.Model(&models.WorkoutSchedule{}).
		Where("user_id = ? AND status = 'COMPLETED' AND scheduled_date >= ? AND scheduled_date <= ?", userID, lastMonday, lastSundayEnd).
		Select("COALESCE(SUM(burned_calories), 0)").
		Row().Scan(&lastWeekTotalCal)

	// 3. Calculate Streak Days
	currentStreak := calculateCurrentStreak(userID, now, loc)
	bestStreak := currentStreak
	if bestStreak < 3 && totalCompleted >= 3 {
		bestStreak = int(totalCompleted) // estimate best streak if completed multiple
	}

	// 4. Calculate Level & EXP (1 workout = 100 EXP, 100 cal = 20 EXP, check-in = 50 EXP)
	exp := int(totalCompleted*100) + int(totalCalories*0.2)
	levelInfo := calculateLevelInfo(exp)

	// 5. Weight Progress Summary
	var firstWeightLog models.WeightLog
	var latestWeightLog models.WeightLog

	startWeight := user.Weight
	if err := config.DB.Where("user_id = ?", userID).Order("log_date asc").First(&firstWeightLog).Error; err == nil {
		startWeight = firstWeightLog.Weight
	}

	currentWeight := user.Weight
	if err := config.DB.Where("user_id = ?", userID).Order("log_date desc").First(&latestWeightLog).Error; err == nil {
		currentWeight = latestWeightLog.Weight
	}

	targetWeight := user.TargetWeight
	if targetWeight <= 0 {
		targetWeight = currentWeight
	}

	weightChange := currentWeight - startWeight
	remainingToTarget := math.Abs(currentWeight - targetWeight)

	var bmi float64 = 0.0
	var bmiCat string = "ปกติ (Normal)"
	if user.Height > 0 {
		hMeters := user.Height / 100.0
		bmi = currentWeight / (hMeters * hMeters)
		if bmi < 18.5 {
			bmiCat = "น้ำหนักน้อยกว่าเกณฑ์ (Underweight)"
		} else if bmi <= 22.9 {
			bmiCat = "น้ำหนักปกติ สมส่วน (Normal)"
		} else if bmi <= 24.9 {
			bmiCat = "ท้วม / น้ำหนักเกิน (Overweight)"
		} else if bmi <= 29.9 {
			bmiCat = "อ้วนระดับ 1 (Obese Class I)"
		} else {
			bmiCat = "อ้วนระดับ 2 (Obese Class II)"
		}
	}

	var daysRemaining int = 0
	var paceKgPerWeek float64 = 0.0
	if user.TargetDate != nil {
		diffHours := user.TargetDate.Sub(now).Hours()
		if diffHours > 0 {
			daysRemaining = int(math.Ceil(diffHours / 24.0))
			weeksRemaining := float64(daysRemaining) / 7.0
			if weeksRemaining > 0 {
				paceKgPerWeek = math.Round((remainingToTarget/weeksRemaining)*100) / 100
			}
		}
	}

	weightSummary := WeightProgressSummary{
		CurrentWeight:     math.Round(currentWeight*10) / 10,
		StartWeight:       math.Round(startWeight*10) / 10,
		TargetWeight:      math.Round(targetWeight*10) / 10,
		TargetDate:        user.TargetDate,
		DaysRemaining:     daysRemaining,
		PaceKgPerWeek:     paceKgPerWeek,
		WeightChange:      math.Round(weightChange*10) / 10,
		RemainingToTarget: math.Round(remainingToTarget*10) / 10,
		BMI:               math.Round(bmi*10) / 10,
		BMICategory:       bmiCat,
	}

	// 6. 30-Day Activity Heatmap
	heatmap := make([]HeatmapDay, 30)
	thirtyDaysAgo := now.AddDate(0, 0, -29)
	for i := 0; i < 30; i++ {
		d := thirtyDaysAgo.AddDate(0, 0, i)
		dStr := d.Format("2006-01-02")

		var count int64
		var cal float64
		config.DB.Model(&models.WorkoutSchedule{}).
			Where("user_id = ? AND status = 'COMPLETED' AND DATE(scheduled_date) = ?", userID, dStr).
			Select("COUNT(*), COALESCE(SUM(burned_calories), 0)").
			Row().Scan(&count, &cal)

		heatmap[i] = HeatmapDay{
			DateStr:      dStr,
			WorkoutCount: int(count),
			Calories:     cal,
			Active:       count > 0,
		}
	}

	res := ProgressAnalyticsResponse{
		WeeklyStats:            weeklyStats,
		ThisWeekCalories:       thisWeekTotalCal,
		LastWeekCalories:       lastWeekTotalCal,
		ThisWeekDurationMins:   thisWeekTotalMins,
		CurrentStreakDays:      currentStreak,
		BestStreakDays:         bestStreak,
		TotalWorkoutsCompleted: totalCompleted,
		TotalCaloriesAllTime:   totalCalories,
		LevelInfo:              levelInfo,
		WeightProgress:         weightSummary,
		ActivityHeatmap:        heatmap,
	}

	return c.JSON(http.StatusOK, res)
}

func calculateCurrentStreak(userID uuid.UUID, now time.Time, loc *time.Location) int {
	streak := 0
	checkDate := now

	for i := 0; i < 365; i++ {
		dStr := checkDate.Format("2006-01-02")
		var count int64
		config.DB.Model(&models.WorkoutSchedule{}).
			Where("user_id = ? AND status = 'COMPLETED' AND DATE(scheduled_date) = ?", userID, dStr).
			Count(&count)

		if count > 0 {
			streak++
			checkDate = checkDate.AddDate(0, 0, -1)
		} else {
			// If today has no workout yet, check yesterday to allow streak continuity
			if i == 0 {
				checkDate = checkDate.AddDate(0, 0, -1)
				continue
			}
			break
		}
	}
	return streak
}

func calculateLevelInfo(exp int) LevelProgressInfo {
	type LevelDef struct {
		Code  string
		Title string
		MinXP int
		MaxXP int
	}

	levels := []LevelDef{
		{Code: "R1", Title: "Beginner Starter (ระดับเริ่มต้น)", MinXP: 0, MaxXP: 500},
		{Code: "R2", Title: "Active Mover (นักเคลื่อนไหวผู้กระฉับกระเฉง)", MinXP: 500, MaxXP: 1500},
		{Code: "R3", Title: "Committed Athlete (นักกีฬาผู้มุ่งมั่น)", MinXP: 1500, MaxXP: 3500},
		{Code: "R4", Title: "Pace Champion (แชมเปียนผู้นำสถิติ)", MinXP: 3500, MaxXP: 7000},
		{Code: "R5", Title: "Elite Legend (ตำนานแห่งความฟิต)", MinXP: 7000, MaxXP: 15000},
	}

	for _, lvl := range levels {
		if exp < lvl.MaxXP || lvl.Code == "R5" {
			span := lvl.MaxXP - lvl.MinXP
			earned := exp - lvl.MinXP
			if earned < 0 {
				earned = 0
			}
			pct := (float64(earned) / float64(span)) * 100.0
			if pct > 100.0 {
				pct = 100.0
			}
			return LevelProgressInfo{
				LevelCode:          lvl.Code,
				LevelTitle:         lvl.Title,
				CurrentEXP:         exp,
				NextLevelEXP:       lvl.MaxXP,
				ProgressPercentage: math.Round(pct*10) / 10,
			}
		}
	}

	return LevelProgressInfo{
		LevelCode:          "R5",
		LevelTitle:         "Elite Legend (ตำนานแห่งความฟิต)",
		CurrentEXP:         exp,
		NextLevelEXP:       15000,
		ProgressPercentage: 100.0,
	}
}
