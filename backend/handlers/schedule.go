package handlers

import (
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"youpace/config"
	"youpace/models"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type UpdateStatusRequest struct {
	Status string `json:"status" validate:"required"` // COMPLETED, MISSED, RESCHEDULED
}

func GetSchedules(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var schedules []models.WorkoutSchedule
	if err := config.DB.Preload("Details.Exercise").Where("user_id = ?", userID).Order("scheduled_date asc").Find(&schedules).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve schedules"})
	}

	for i := range schedules {
		if schedules[i].BurnedCalories == 0 && len(schedules[i].Details) > 0 {
			var totalBurnRate float64 = 0.0
			var count int = 0
			for _, det := range schedules[i].Details {
				if det.Exercise.BurnRate > 0 {
					totalBurnRate += det.Exercise.BurnRate
					count++
				}
			}
			var avgBurnRate float64 = 6.0
			if count > 0 {
				avgBurnRate = totalBurnRate / float64(count)
			}
			schedules[i].BurnedCalories = float64(schedules[i].DurationMinutes) * avgBurnRate
			config.DB.Model(&models.WorkoutSchedule{}).Where("schedule_id = ?", schedules[i].ScheduleID).Update("burned_calories", schedules[i].BurnedCalories)
		}
	}

	return c.JSON(http.StatusOK, schedules)
}

func GenerateWeeklySchedule(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	// 1. Fetch available exercises matching user tools
	var exercises []models.Exercise
	if err := config.DB.Find(&exercises).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to load exercises"})
	}

	if len(exercises) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "no exercises in database, please seed exercises first"})
	}

	// Parse user profile equipment and limitations
	userEquips := []string{}
	if user.EquipmentOwned != "" {
		parts := strings.Split(strings.ToLower(user.EquipmentOwned), ",")
		for _, p := range parts {
			userEquips = append(userEquips, strings.TrimSpace(p))
		}
	}
	// Fallback to Bodyweight if none specified
	if len(userEquips) == 0 {
		userEquips = append(userEquips, "bodyweight")
	}

	userLimits := []string{}
	if user.PhysicalLimitations != "" {
		parts := strings.Split(strings.ToLower(user.PhysicalLimitations), ",")
		for _, p := range parts {
			userLimits = append(userLimits, strings.TrimSpace(p))
		}
	}

	// Prepare suggested exercise list filtered by equipments and limitations
	suggested := []models.Exercise{}
	for _, ex := range exercises {
		exEquipLower := strings.ToLower(ex.EquipmentNeeded)

		// 1. Check Equipment: Exercise must match user's owned equipment
		hasEquipment := false
		for _, eq := range userEquips {
			if strings.Contains(exEquipLower, eq) || (eq == "bodyweight" && exEquipLower == "bodyweight") {
				hasEquipment = true
				break
			}
		}
		if !hasEquipment {
			continue // Skip if user doesn't have the needed equipment
		}

		// 2. Check Physical Limitations: Avoid exercises that strain injured muscle groups
		isSafe := true
		exMuscleLower := strings.ToLower(ex.MuscleGroup)
		for _, limit := range userLimits {
			if strings.Contains(limit, "knee") || strings.Contains(limit, "เข่า") {
				if exMuscleLower == "legs" || strings.Contains(strings.ToLower(ex.Name), "squat") || strings.Contains(strings.ToLower(ex.Name), "lunge") || strings.Contains(strings.ToLower(ex.Name), "burpee") {
					isSafe = false
					break
				}
			}
			if strings.Contains(limit, "back") || strings.Contains(limit, "หลัง") {
				if exMuscleLower == "back" {
					isSafe = false
					break
				}
			}
			if strings.Contains(limit, "shoulder") || strings.Contains(limit, "ไหล่") {
				if exMuscleLower == "shoulders" || strings.Contains(strings.ToLower(ex.Name), "shoulder") {
					isSafe = false
					break
				}
			}
			if strings.Contains(limit, "ankle") || strings.Contains(limit, "ข้อเท้า") {
				if strings.Contains(strings.ToLower(ex.Name), "burpee") || strings.Contains(strings.ToLower(ex.Name), "lunge") {
					isSafe = false
					break
				}
			}
		}

		if !isSafe {
			continue // Skip unsafe exercise
		}

		suggested = append(suggested, ex)
	}

	// If all exercises are filtered out, fallback to all exercises as a safety net
	if len(suggested) == 0 {
		suggested = exercises
	}

	// 2. Determine target workout days for the next 7 days (e.g., 3 days per week)
	daysToGenerate := []int{1, 3, 5} // Mon, Wed, Fri (offset from today)
	today := time.Now()

	schedulesCreated := []models.WorkoutSchedule{}

	for _, offset := range daysToGenerate {
		workoutDate := today.AddDate(0, 0, offset)

		// Check if schedule already exists on this date
		var existing models.WorkoutSchedule
		err := config.DB.Where("user_id = ? AND scheduled_date = ?", userID, workoutDate.Format("2006-01-02")).First(&existing).Error
		if err == nil {
			continue // Skip if already planned
		}

		// Customize title based on fitness goals
		title := "General Fitness Routine"
		intensity := "MODERATE"

		switch user.FitnessGoal {
		case "LOSE_WEIGHT":
			title = "Fat Burn & Cardio Session"
			intensity = "MODERATE"
		case "GAIN_MUSCLE":
			title = "Strength & Muscle Building"
			intensity = "INTENSE"
		case "IMPROVE_ENDURANCE":
			title = "Stamina & Cardio Endurance"
			intensity = "MODERATE"
		case "MAINTAIN_HEALTH":
			title = "Active Health Recovery"
			intensity = "LIGHT"
		}

		// Assign 3 suggested exercises to this workout plan
		selectedEx := []models.Exercise{}
		var totalBurnRate float64 = 0.0
		for i := 0; i < 3; i++ {
			if len(suggested) > 0 {
				idx := rand.Intn(len(suggested))
				ex := suggested[idx]
				selectedEx = append(selectedEx, ex)
				if ex.BurnRate > 0 {
					totalBurnRate += ex.BurnRate
				}
			}
		}

		var avgBurnRate float64 = 6.0
		if len(selectedEx) > 0 && totalBurnRate > 0 {
			avgBurnRate = totalBurnRate / float64(len(selectedEx))
		}
		estimatedBurnedCalories := 30.0 * avgBurnRate

		schedule := models.WorkoutSchedule{
			UserID:          userID,
			Title:           title,
			ScheduledDate:   workoutDate,
			DurationMinutes: 30, // Default 30 mins
			Status:          "PENDING",
			TargetIntensity: intensity,
			BurnedCalories:  estimatedBurnedCalories,
		}

		if err := config.DB.Create(&schedule).Error; err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to create schedule"})
		}

		for _, ex := range selectedEx {
			detail := models.WorkoutScheduleDetail{
				WorkoutScheduleID: schedule.ScheduleID,
				ExerciseID:        ex.ExerciseID,
				Sets:              3,
				Reps:              12,
				DurationSeconds:   45,
			}
			config.DB.Create(&detail)
		}

		schedulesCreated = append(schedulesCreated, schedule)
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message":   "weekly workout schedule generated successfully",
		"schedules": schedulesCreated,
	})
}

func UpdateScheduleStatus(c echo.Context) error {
	scheduleIDStr := c.Param("id")
	scheduleID, err := uuid.Parse(scheduleIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid schedule ID"})
	}

	var req UpdateStatusRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var schedule models.WorkoutSchedule
	if err := config.DB.Preload("Details.Exercise").Where("schedule_id = ? AND user_id = ?", scheduleID, userID).First(&schedule).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "schedule not found"})
	}

	schedule.Status = req.Status

	if req.Status == "COMPLETED" {
		// Calculate total calories burned
		var totalBurnRate float64 = 0.0
		var count int = 0
		for _, det := range schedule.Details {
			if det.Exercise.BurnRate > 0 {
				totalBurnRate += det.Exercise.BurnRate
				count++
			}
		}

		if totalBurnRate == 0 {
			totalBurnRate = 6.0 // Fallback calories per min (like moderate walking/bodyweight)
		} else {
			totalBurnRate = totalBurnRate / float64(count) // Average burn rate
		}

		schedule.BurnedCalories = float64(schedule.DurationMinutes) * totalBurnRate

		// Trigger Milestone Check
		go checkForMilestones(userID)
	} else {
		schedule.BurnedCalories = 0
	}

	if err := config.DB.Save(&schedule).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update status"})
	}

	return c.JSON(http.StatusOK, schedule)
}

type LogCustomBurnRequest struct {
	Title              string  `json:"title"`
	DurationMinutes    int     `json:"durationMinutes"`
	BurnedCalories     float64 `json:"burnedCalories"`
	Description        string  `json:"description"`
	ScheduledDate      string  `json:"scheduledDate"`
	ScheduledTime      string  `json:"scheduledTime"`
	TargetIntensity    string  `json:"targetIntensity"`
	SkipGoogleCalendar bool    `json:"skipGoogleCalendar"`
}

func LogCustomBurnWorkout(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var req LogCustomBurnRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if req.Title == "" {
		req.Title = "กิจกรรมเผาผลาญ (Manual Activity)"
	}
	if req.DurationMinutes <= 0 {
		req.DurationMinutes = 30
	}
	if req.BurnedCalories <= 0 {
		req.BurnedCalories = float64(req.DurationMinutes) * 6.0
	}

	loc, errLoc := time.LoadLocation("Asia/Bangkok")
	if errLoc != nil {
		loc = time.FixedZone("ICT", 7*3600)
	}

	now := time.Now().In(loc)
	scheduledDate := now

	if req.ScheduledDate != "" {
		timeStr := strings.TrimSpace(req.ScheduledTime)
		if timeStr == "" {
			timeStr = fmt.Sprintf("%02d:%02d:00", now.Hour(), now.Minute())
		} else if len(timeStr) == 5 {
			timeStr = timeStr + ":00"
		}

		dateTimeCombined := fmt.Sprintf("%s %s", strings.TrimSpace(req.ScheduledDate), timeStr)
		if parsed, err := time.ParseInLocation("2006-01-02 15:04:05", dateTimeCombined, loc); err == nil {
			scheduledDate = parsed
		} else if parsed, err := time.ParseInLocation("2006-01-02 15:04", dateTimeCombined, loc); err == nil {
			scheduledDate = parsed
		} else if parsed, err := time.ParseInLocation("2006-01-02", req.ScheduledDate, loc); err == nil {
			scheduledDate = time.Date(parsed.Year(), parsed.Month(), parsed.Day(), now.Hour(), now.Minute(), 0, 0, loc)
		} else if parsed, err := time.Parse(time.RFC3339, req.ScheduledDate); err == nil {
			scheduledDate = parsed.In(loc)
		}
	}

	intensity := "MODERATE"
	if req.TargetIntensity != "" {
		intensity = strings.ToUpper(req.TargetIntensity)
	}

	schedule := models.WorkoutSchedule{
		UserID:          userID,
		Title:           req.Title,
		ScheduledDate:   scheduledDate,
		DurationMinutes: req.DurationMinutes,
		Status:          "COMPLETED",
		TargetIntensity: intensity,
		BurnedCalories:  req.BurnedCalories,
	}

	if err := config.DB.Create(&schedule).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to log custom burn activity"})
	}

	if req.Description != "" {
		lines := strings.Split(req.Description, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" || (!strings.HasPrefix(line, "•") && !strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "*")) {
				continue
			}
			lineClean := strings.TrimLeft(line, "•-* \t")

			if strings.HasPrefix(lineClean, "ประโยชน์") ||
				strings.HasPrefix(lineClean, "เผาผลาญ") ||
				strings.HasPrefix(lineClean, "#") ||
				strings.HasPrefix(lineClean, "คำแนะนำ") {
				continue
			}

			parts := strings.Split(lineClean, "-")
			if len(parts) == 0 {
				continue
			}
			exName := strings.TrimSpace(parts[0])
			exName = strings.Trim(exName, "()[]{}*# \t")

			if exName == "" || strings.EqualFold(exName, "อุปกรณ์") || strings.EqualFold(exName, "กล้ามเนื้อ") {
				continue
			}

			var ex models.Exercise
			if err := config.DB.Where("LOWER(name) = ?", strings.ToLower(exName)).First(&ex).Error; err != nil {
				ex = models.Exercise{
					Name:            exName,
					Description:     exName,
					MuscleGroup:     "Full Body",
					EquipmentNeeded: "Bodyweight",
					BurnRate:        6.0,
					DifficultyLevel: "BEGINNER",
				}
				config.DB.Create(&ex)
			}

			detail := models.WorkoutScheduleDetail{
				WorkoutScheduleID: schedule.ScheduleID,
				ExerciseID:        ex.ExerciseID,
				Sets:              3,
				Reps:              12,
				DurationSeconds:   45,
			}
			config.DB.Create(&detail)
		}
	}

	// Trigger Milestone Check
	go checkForMilestones(userID)

	// Create Event on Google Calendar only if not skipped
	if !req.SkipGoogleCalendar {
		go CreateGoogleCalendarWorkoutEvent(userID, req.Title, scheduledDate, req.DurationMinutes, req.BurnedCalories, req.Description)
	}

	return c.JSON(http.StatusCreated, schedule)
}

func Reschedule(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	// 1. Find all PENDING or MISSED workouts on or before today
	todayStr := time.Now().Format("2006-01-02")

	var pastWorkouts []models.WorkoutSchedule
	err = config.DB.Where("user_id = ? AND status IN ('PENDING', 'MISSED') AND scheduled_date <= ?", userID, todayStr).Find(&pastWorkouts).Error
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to lookup past workouts"})
	}

	if len(pastWorkouts) == 0 {
		return c.JSON(http.StatusOK, map[string]string{"message": "no workouts need rescheduling"})
	}

	rescheduledCount := 0
	nextDate := time.Now().AddDate(0, 0, 1) // Start scheduling from tomorrow

	for i := range pastWorkouts {
		// Loop until we find a date tomorrow or later that doesn't have a schedule
		foundEmptyDate := false
		for !foundEmptyDate {
			dateStr := nextDate.Format("2006-01-02")

			var duplicate models.WorkoutSchedule
			err := config.DB.Where("user_id = ? AND scheduled_date = ?", userID, dateStr).First(&duplicate).Error
			if err != nil {
				// No schedule on this day, we can reschedule here!
				foundEmptyDate = true
			} else {
				// Already has workout on this day, check next day
				nextDate = nextDate.AddDate(0, 0, 1)
			}
		}

		// Update schedule date
		pastWorkouts[i].ScheduledDate = nextDate
		pastWorkouts[i].Status = "RESCHEDULED"
		config.DB.Save(&pastWorkouts[i])

		rescheduledCount++
		nextDate = nextDate.AddDate(0, 0, 1) // Increment for next rescheduling
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":          "rescheduling completed successfully",
		"rescheduledCount": rescheduledCount,
	})
}

func DeleteAllSchedules(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var schedules []models.WorkoutSchedule
	config.DB.Where("user_id = ?", userID).Find(&schedules)
	for _, s := range schedules {
		config.DB.Where("workout_schedule_id = ?", s.ScheduleID).Delete(&models.WorkoutScheduleDetail{})
	}
	config.DB.Where("user_id = ?", userID).Delete(&models.WorkoutSchedule{})

	// Also delete YourPace workout events from Google Calendar
	go DeleteGoogleCalendarWorkoutEvents(userID)

	return c.JSON(http.StatusOK, map[string]string{"message": "all schedules deleted successfully"})
}

func DeleteSchedule(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	scheduleIDStr := c.Param("id")
	scheduleID, err := uuid.Parse(scheduleIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid schedule ID"})
	}

	config.DB.Where("workout_schedule_id = ?", scheduleID).Delete(&models.WorkoutScheduleDetail{})
	if err := config.DB.Where("schedule_id = ? AND user_id = ?", scheduleID, userID).Delete(&models.WorkoutSchedule{}).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to delete schedule"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "schedule deleted successfully"})
}

// Check and award milestones based on user performance
func checkForMilestones(userID uuid.UUID) {
	var completedCount int64
	if err := config.DB.Model(&models.WorkoutSchedule{}).Where("user_id = ? AND status = 'COMPLETED'", userID).Count(&completedCount).Error; err != nil {
		return
	}

	var totalCal float64
	config.DB.Model(&models.WorkoutSchedule{}).Where("user_id = ? AND status = 'COMPLETED'", userID).Select("COALESCE(SUM(burned_calories), 0)").Row().Scan(&totalCal)

	var weightLogCount int64
	config.DB.Model(&models.WeightLog{}).Where("user_id = ?", userID).Count(&weightLogCount)

	type BadgeRule struct {
		Type        string
		Title       string
		Description string
		Condition   bool
	}

	rules := []BadgeRule{
		{
			Type:        "FIRST_WORKOUT",
			Title:       "🏅 First Step Completed! (ก้าวแรกสู่สุขภาพดี)",
			Description: "ยินดีด้วยที่คุณออกกำลังกายครั้งแรกสำเร็จ! ก้าวแรกคือจุดเริ่มต้นของความสำเร็จ",
			Condition:   completedCount >= 1,
		},
		{
			Type:        "STREAK_3",
			Title:       "🔥 Consistency Starter (ฟิตต่อเนื่อง 3 กิจกรรม)",
			Description: "ออกกำลังกายครบ 3 ครั้งแล้ว ความสม่ำเสมอคือกุญแจสู่ผลลัพธ์ที่ยั่งยืน!",
			Condition:   completedCount >= 3,
		},
		{
			Type:        "WORKOUT_5",
			Title:       "⚡ Active Warrior (นักสู้ผู้กระฉับกระเฉง 5 ครั้ง)",
			Description: "พิชิตการออกกำลังกายสะสม 5 กิจกรรม ร่างกายกำลังปรับตัวสู่เวอร์ชันที่แข็งแกร่งขึ้น!",
			Condition:   completedCount >= 5,
		},
		{
			Type:        "WORKOUT_10",
			Title:       "👑 Discipline Master (ปรมาจารย์แห่งวินัย 10 ครั้ง)",
			Description: "สุดยอดมาก! พิชิตการออกกำลังกายครบ 10 ครั้ง วินัยของคุณสร้างผลลัพธ์ที่ชัดเจน",
			Condition:   completedCount >= 10,
		},
		{
			Type:        "BURN_1000",
			Title:       "💥 Calorie Crusher 1K (พิชิต 1,000 kcal แรก)",
			Description: "เผาผลาญพลังงานสะสมทะลุ 1,000 kcal! ไขมันเริ่มสลาย พลังงานเพิ่มขึ้น",
			Condition:   totalCal >= 1000,
		},
		{
			Type:        "BURN_5000",
			Title:       "🚀 Calorie Legend 5K (มหากาพย์ 5,000 kcal)",
			Description: "สุดยอดสถิติ เผาผลาญพลังงานสะสมทะลุ 5,000 kcal แล้ว!",
			Condition:   totalCal >= 5000,
		},
		{
			Type:        "WEIGHT_TRACKED",
			Title:       "⚖️ Self-Awareness (นักบันทึกน้ำหนักผู้ใส่ใจ)",
			Description: "บันทึกและติดตามน้ำหนักของตัวเองอย่างสม่ำเสมอ เพื่อเห็นการเปลี่ยนแปลงที่ชัดเจน",
			Condition:   weightLogCount >= 1,
		},
	}

	for _, r := range rules {
		if r.Condition {
			var existing models.Milestone
			if err := config.DB.Where("user_id = ? AND milestone_type = ?", userID, r.Type).First(&existing).Error; err != nil {
				m := models.Milestone{
					UserID:        userID,
					Title:         r.Title,
					Description:   r.Description,
					DateAchieved:  time.Now(),
					MilestoneType: r.Type,
				}
				config.DB.Create(&m)
			}
		}
	}
}
