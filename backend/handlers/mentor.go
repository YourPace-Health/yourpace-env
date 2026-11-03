package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"youpace/config"
	"youpace/models"
	"youpace/services"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type ChatRequest struct {
	Message string `json:"message" validate:"required"`
}

type N8NPlanRequest struct {
	CalendarEvents []map[string]interface{} `json:"calendarEvents"`
	UserNote       string                   `json:"userNote"`
	DaysCount      int                      `json:"daysCount"`
}

func ChatWithMentor(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var req ChatRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if strings.TrimSpace(req.Message) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "message is required"})
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	// 1. Save User's message to Database
	userChat := models.ChatMessage{
		UserID:    userID,
		Sender:    "user",
		Message:   req.Message,
		CreatedAt: time.Now(),
	}
	_ = config.DB.Create(&userChat)

	// 2. Fetch last 6 chat messages for conversation context memory
	var recentChats []models.ChatMessage
	config.DB.Where("user_id = ?", userID).
		Order("created_at desc").
		Limit(8).
		Find(&recentChats)

	var historyLines []string
	for i := len(recentChats) - 1; i >= 0; i-- {
		chat := recentChats[i]
		if chat.ID == userChat.ID {
			continue
		}
		senderName := "ผู้ใช้"
		if chat.Sender == "ai" {
			senderName = "AI Mentor"
		}
		historyLines = append(historyLines, fmt.Sprintf("- %s: %s", senderName, chat.Message))
	}
	historyContext := strings.Join(historyLines, "\n")

	// Prepare user health context string
	profileContext := fmt.Sprintf(`- อายุ: %d
- เพศ: %s
- ส่วนสูง: %.1f ซม.
- น้ำหนัก: %.1f กก.
- เป้าหมายฟิตเนส: %s
- อุปกรณ์ที่มี: %s
- ข้อจำกัดทางร่างกาย: %s`,
		user.Age, user.Gender, user.Height, user.Weight, user.FitnessGoal, user.EquipmentOwned, user.PhysicalLimitations)

	reply, err := services.ChatWithMentor(profileContext, historyContext, req.Message)
	if err != nil {
		reply = "[AI Error] ไม่สามารถเชื่อมต่อกับ AI Mentor ได้ในขณะนี้: " + err.Error()
	}

	// 3. Save AI's response to Database
	aiChat := models.ChatMessage{
		UserID:    userID,
		Sender:    "ai",
		Message:   reply,
		CreatedAt: time.Now(),
	}
	_ = config.DB.Create(&aiChat)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"response":  reply,
		"messageId": aiChat.ID,
		"createdAt": aiChat.CreatedAt,
	})
}

// GetChatHistory returns all chat history for the authenticated user
func GetChatHistory(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	var messages []models.ChatMessage
	if err := config.DB.Where("user_id = ?", userID).Order("created_at asc").Find(&messages).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to fetch chat history"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"messages": messages,
		"count":    len(messages),
	})
}

// ClearChatHistory deletes all chat messages for the authenticated user
func ClearChatHistory(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	if err := config.DB.Where("user_id = ?", userID).Delete(&models.ChatMessage{}).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to clear chat history"})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "chat history cleared successfully",
	})
}


type CalculateBurnRequest struct {
	Title           string  `json:"title"`
	DurationMinutes int     `json:"durationMinutes"`
	Intensity       string  `json:"intensity"`
	Description     string  `json:"description"`
}

type IntensityBurnDetail struct {
	Calories    float64 `json:"calories"`
	Description string  `json:"description"`
}

type CalculateBurnMultiIntensityResponse struct {
	Light       IntensityBurnDetail `json:"light"`
	Moderate    IntensityBurnDetail `json:"moderate"`
	Intense     IntensityBurnDetail `json:"intense"`
	Explanation string              `json:"explanation"`
}

// CalculateBurnWithN8N receives workout activity details and duration, then asks n8n AI to calculate burned calories for all 3 intensity levels at once
func CalculateBurnWithN8N(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	var req CalculateBurnRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if req.Title == "" {
		req.Title = "กิจกรรมออกกำลังกาย"
	}
	if req.DurationMinutes <= 0 {
		req.DurationMinutes = 30
	}

	var user models.User
	config.DB.First(&user, userID)

	userWeight := user.Weight
	if userWeight <= 0 {
		userWeight = 60.0
	}
	userHeight := user.Height
	if userHeight <= 0 {
		userHeight = 165.0
	}
	userAge := user.Age
	if userAge <= 0 {
		userAge = 25
	}
	userGender := user.Gender
	if userGender == "" {
		userGender = "ไม่ระบุ"
	}

	prompt := fmt.Sprintf(`คุณคือ AI ผู้เชี่ยวชาญด้านวิทยาศาสตร์การกีฬาและการเผาผลาญพลังงาน (Sports Science & Calorie Expenditure Specialist)
กรุณาวิเคราะห์และคำนวณพลังงานที่เผาผลาญ (Calories Burned หน่วย kcal) สำหรับกิจกรรมการออกกำลังกายนี้ โดยแยกออกเป็น 3 ระดับความเข้มข้น (Intensity Levels: Light, Moderate, Intense) พร้อมกัน:

[ข้อมูลกิจกรรม]
- ชื่อกิจกรรม/ชนิดกีฬา: %s
- ระยะเวลา: %d นาที
- รายละเอียดหรือบริบทเพิ่มเติม: %s

[ข้อมูลผู้ใช้งาน]
- เพศ: %s
- อายุ: %d ปี
- น้ำหนัก: %.1f กก.
- ส่วนสูง: %.1f ซม.
- เป้าหมายฟิตเนส: %s

กรุณาคำนวณตามหลัก METs (Metabolic Equivalent of Task)
โปรดตอบกลับในรูปแบบ JSON เท่านั้น (ห้ามมีคำนำหรือ markdown อื่นนอกเหนือจาก JSON):
{
  "light": {
    "calories": <ตัวเลขแคลอรี่ระดับเบาๆ>,
    "description": "สบายๆ พูดคุยได้ต่อเนื่อง"
  },
  "moderate": {
    "calories": <ตัวเลขแคลอรี่ระดับปานกลาง>,
    "description": "เหงื่อซึม หายใจเร็วขึ้น"
  },
  "intense": {
    "calories": <ตัวเลขแคลอรี่ระดับหนักหน่วง>,
    "description": "เหนื่อยหอบ ท้าทาย"
  },
  "explanation": "<คำอธิบายสั้นๆ 1-2 ประโยคเป็นภาษาไทย เช่น คิดจากค่า METs ประมาณ 4.0-8.5 ตามระดับความเข้มข้น สำหรับน้ำหนัก %.1f กก. ในเวลา %d นาที>"
}`, req.Title, req.DurationMinutes, req.Description, userGender, userAge, userWeight, userHeight, user.FitnessGoal, userWeight, req.DurationMinutes)

	var est services.BurnEstimate
	if aiReply, err := services.CallGemini(prompt); err == nil && aiReply != "" {
		est = services.ParseBurnReply(aiReply)
	}
	est = services.FillBurnDefaults(est, userWeight, req.DurationMinutes)

	return c.JSON(http.StatusOK, CalculateBurnMultiIntensityResponse{
		Light:       IntensityBurnDetail{Calories: est.Light.Calories, Description: est.Light.Description},
		Moderate:    IntensityBurnDetail{Calories: est.Moderate.Calories, Description: est.Moderate.Description},
		Intense:     IntensityBurnDetail{Calories: est.Intense.Calories, Description: est.Intense.Description},
		Explanation: est.Explanation,
	})
}

// PlanWorkoutInFreeTimeWithN8N receives calendar events and profile data to plan workouts via n8n AI
func PlanWorkoutInFreeTimeWithN8N(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	var req N8NPlanRequest
	_ = c.Bind(&req)

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	loc, errLoc := time.LoadLocation("Asia/Bangkok")
	if errLoc != nil {
		loc = time.FixedZone("ICT", 7*3600)
	}
	now := time.Now().In(loc)
	todayStr := now.Format("02/01/2006")

	// Format calendar events for AI prompt context
	eventsSummary := "ไม่มีนัดหมายในตารางงาน (ผู้ใช้มีเวลาว่างตลอดทั้งสัปดาห์)"
	if len(req.CalendarEvents) > 0 {
		eventsSummary = ""
		for idx, ev := range req.CalendarEvents {
			summary, _ := ev["summary"].(string)
			if summary == "" {
				summary = "นัดหมายทั่วไป"
			}
			startMap, _ := ev["start"].(map[string]interface{})
			dateTime, _ := startMap["dateTime"].(string)
			date, _ := startMap["date"].(string)
			timeStr := dateTime
			if timeStr == "" {
				timeStr = date
			}
			eventsSummary += fmt.Sprintf("%d. %s (เวลา/วัน: %s)\n", idx+1, summary, timeStr)
		}
	}

	daysTarget := req.DaysCount
	if daysTarget <= 0 {
		daysTarget = 3
	}

	userNotesText := "ไม่มีเงื่อนไขเพิ่มเติม"
	if strings.TrimSpace(req.UserNote) != "" {
		userNotesText = strings.TrimSpace(req.UserNote)
	}

	prompt := fmt.Sprintf(`คุณคือ AI Personal Health & Fitness Mentor ประจำแพลตฟอร์ม youPace.
ผู้ใช้ต้องการให้คุณช่วยวางแผนและออกแบบตารางออกกำลังกายใน "ช่วงเวลาว่างที่ไม่มีนัดหมาย" จากตารางงาน Google Calendar สำหรับ 7 วันข้างหน้า (เริ่มตั้งแต่วันนี้ %s เป็นต้นไป)

=== ข้อมูลส่วนบุคคลและเงื่อนไขสุขภาพของผู้ใช้ ===
- ชื่อผู้ใช้: %s
- อายุ: %d ปี
- เพศ: %s
- ส่วนสูง: %.1f ซม.
- น้ำหนัก: %.1f กก.
- เป้าหมายสุขภาพ/ฟิตเนส: %s
- อุปกรณ์ที่มีประจำตัว: %s
- ข้อจำกัดทางร่างกาย/อาการบาดเจ็บ: %s

=== ตารางนัดหมาย/กิจกรรมทั้งหมดใน Google Calendar สัปดาห์นี้ ===
%s

=== เงื่อนไขหรือคำขอพิเศษเพิ่มเติมจากผู้ใช้ (สำคัญที่สุด) ===
%s

คำสั่งและข้อกำหนด:
1. วิเคราะห์ช่วงเวลาว่างที่ไม่มีนัดหมายซ้อนทับจาก Google Calendar ข้างต้น (หรือหากไม่มีนัดหมาย ให้เลือกช่วงเวลาว่างที่เหมาะสมในแต่ละวัน เช่น ช่วงเช้า 07:00-08:00 หรือ ช่วงเย็น 17:30-18:30)
2. ปฏิบัติตาม "เงื่อนไขหรือคำขอพิเศษเพิ่มเติมจากผู้ใช้" อย่างเคร่งครัด 100%% (เช่น หากผู้ใช้ระบุว่างดวันเสาร์, วันเสาร์ไม่ว่าง, งดออกกำลังกายวันใด หรือต้องการเน้นเฉพาะช่วงเวลาใด ห้ามจัดตารางในวันหรือเวลาที่ผู้ใช้ไม่สะดวกเด็ดขาด)
3. วางแผนตารางการออกกำลังกายจำนวน %d วันในรอบ 7 วันนี้ ให้เหมาะสมที่สุดตามเป้าหมาย อุปกรณ์ที่มี ข้อจำกัดทางร่างกาย และเงื่อนไขพิเศษที่ผู้ใช้ระบุ
4. เขียนข้อความทักทายและอธิบายภาพรวมแผนการออกกำลังกายเป็นภาษาไทยที่สุภาพ เป็นกันเอง และให้กำลังใจ
5. **สำคัญมาก**: สำหรับแต่ละวันที่คุณจัดตารางซ้อม คุณต้องระบุบล็อกรูปแบบแท็กโครงสร้างดังนี้ต่อท้ายข้อความ เพื่อให้ระบบนำไปบันทึกลงตารางซ้อมและการ์ดกิจกรรมอัตโนมัติ (ห้ามละเว้นรูปแบบแท็กนี้เด็ดขาด):

[TIME: DD/MM/YYYY HH:MM ถึง HH:MM] [EVENT: ชื่อโปรแกรมการฝึก] [INTENSITY: MODERATE] [DESC:
- ชื่อท่าฝึกที่ 1 (เซ็ต x ครั้ง)
- ชื่อท่าฝึกที่ 2 (เซ็ต x ครั้ง)
- ชื่อท่าฝึกที่ 3 (เซ็ต x ครั้ง)
เผาผลาญประมาณ: 250 kcal
ประโยชน์และคำแนะนำ: คำแนะนำสั้นๆ สำหรับวันนี้]

ตัวอย่างวันที่: ใช้วันที่จริงรูปแบบ วัน/เดือน/ปี ค.ศ. เช่น %s เป็นต้น`,
		todayStr, user.Username, user.Age, user.Gender, user.Height, user.Weight, user.FitnessGoal, user.EquipmentOwned, user.PhysicalLimitations, eventsSummary, userNotesText, daysTarget, todayStr)

	reply, err := services.CallGemini(prompt)
	if err != nil {
		reply = "[n8n Error] ไม่สามารถเชื่อมต่อกับ n8n AI ได้: " + err.Error()
	}

	// Parse and save schedules to DB & sync to Google Calendar
	createdCount := parseAndSaveN8NSchedules(userID, reply)
	if createdCount == 0 && err == nil {
		// Fallback to ensure user always gets schedules created
		generateSmartFallbackSchedule(userID, user)
	}

	return c.JSON(http.StatusOK, map[string]string{
		"response": reply,
	})
}

func parseAndSaveN8NSchedules(userID uuid.UUID, aiReply string) int {
	loc, errLoc := time.LoadLocation("Asia/Bangkok")
	if errLoc != nil {
		loc = time.FixedZone("ICT", 7*3600)
	}

	createdCount := 0
	for _, w := range services.ParsePlannedWorkouts(aiReply, time.Now().In(loc), loc) {
		// Skip if the user already has a workout on that date
		var existing models.WorkoutSchedule
		if err := config.DB.Where("user_id = ? AND scheduled_date = ?", userID, w.Date.Format("2006-01-02")).First(&existing).Error; err == nil {
			continue
		}

		schedule := models.WorkoutSchedule{
			UserID:          userID,
			Title:           w.Title,
			ScheduledDate:   w.Date,
			DurationMinutes: w.DurationMinutes,
			Status:          "PENDING",
			TargetIntensity: w.Intensity,
			BurnedCalories:  w.BurnedCalories,
		}
		if err := config.DB.Create(&schedule).Error; err != nil {
			continue
		}
		createdCount++

		// Create Google Calendar Workout Event if user connected Google Calendar
		go CreateGoogleCalendarWorkoutEvent(userID, schedule.Title, schedule.ScheduledDate, schedule.DurationMinutes, schedule.BurnedCalories, w.Description)

		for _, exName := range services.ExtractExerciseNames(w.Description) {
			saveScheduleExercise(schedule.ScheduleID, exName)
		}
	}
	return createdCount
}

// saveScheduleExercise links an exercise (created if unknown) to a schedule.
func saveScheduleExercise(scheduleID uuid.UUID, name string) {
	var ex models.Exercise
	if err := config.DB.Where("LOWER(name) = ?", strings.ToLower(name)).First(&ex).Error; err != nil {
		ex = models.Exercise{
			Name:            name,
			Description:     name,
			MuscleGroup:     "Full Body",
			EquipmentNeeded: "Bodyweight",
			BurnRate:        6.0,
			DifficultyLevel: "BEGINNER",
		}
		config.DB.Create(&ex)
	}
	config.DB.Create(&models.WorkoutScheduleDetail{
		WorkoutScheduleID: scheduleID,
		ExerciseID:        ex.ExerciseID,
		Sets:              3,
		Reps:              12,
		DurationSeconds:   45,
	})
}

func generateSmartFallbackSchedule(userID uuid.UUID, user models.User) int {
	var exercises []models.Exercise
	config.DB.Find(&exercises)

	loc, errLoc := time.LoadLocation("Asia/Bangkok")
	if errLoc != nil {
		loc = time.FixedZone("ICT", 7*3600)
	}
	now := time.Now().In(loc)

	days := []int{0, 2, 4} // Today, +2 days, +4 days
	created := 0

	title := "Fat Burn & Cardio Routine"
	intensity := "MODERATE"
	switch user.FitnessGoal {
	case "GAIN_MUSCLE":
		title = "Strength & Muscle Building Routine"
		intensity = "INTENSE"
	case "IMPROVE_ENDURANCE":
		title = "Endurance & Stamina Circuit"
		intensity = "MODERATE"
	case "MAINTAIN_HEALTH":
		title = "Active Daily Recovery"
		intensity = "LIGHT"
	}

	for _, d := range days {
		wDate := time.Date(now.Year(), now.Month(), now.Day()+d, 17, 30, 0, 0, loc)
		var existing models.WorkoutSchedule
		if err := config.DB.Where("user_id = ? AND scheduled_date = ?", userID, wDate.Format("2006-01-02")).First(&existing).Error; err == nil {
			continue
		}

		durationMins := 35
		burnedCal := float64(durationMins) * 6.5

		schedule := models.WorkoutSchedule{
			UserID:          userID,
			Title:           title,
			ScheduledDate:   wDate,
			DurationMinutes: durationMins,
			Status:          "PENDING",
			TargetIntensity: intensity,
			BurnedCalories:  burnedCal,
		}

		if err := config.DB.Create(&schedule).Error; err == nil {
			created++
			for i := 0; i < 3 && i < len(exercises); i++ {
				detail := models.WorkoutScheduleDetail{
					WorkoutScheduleID: schedule.ScheduleID,
					ExerciseID:        exercises[i].ExerciseID,
					Sets:              3,
					Reps:              12,
					DurationSeconds:   45,
				}
				config.DB.Create(&detail)
			}
			go CreateGoogleCalendarWorkoutEvent(userID, schedule.Title, schedule.ScheduledDate, schedule.DurationMinutes, schedule.BurnedCalories, "ตารางออกกำลังกายจัดสรรโดย youPace AI")
		}
	}
	return created
}

// GenerateWeeklyHealthRecap generates an inspiring AI-powered weekly performance review
func GenerateWeeklyHealthRecap(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var user models.User
	config.DB.First(&user, userID)

	loc, _ := time.LoadLocation("Asia/Bangkok")
	if loc == nil {
		loc = time.FixedZone("ICT", 7*3600)
	}
	now := time.Now().In(loc)

	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	monday := now.AddDate(0, 0, -(weekday - 1))
	mondayStart := time.Date(monday.Year(), monday.Month(), monday.Day(), 0, 0, 0, 0, loc)

	var thisWeekCount int64
	var thisWeekCalories float64
	var thisWeekMins int
	config.DB.Model(&models.WorkoutSchedule{}).
		Where("user_id = ? AND status = 'COMPLETED' AND scheduled_date >= ?", userID, mondayStart).
		Select("COUNT(*), COALESCE(SUM(burned_calories), 0), COALESCE(SUM(duration_minutes), 0)").
		Row().Scan(&thisWeekCount, &thisWeekCalories, &thisWeekMins)

	lastMonday := mondayStart.AddDate(0, 0, -7)
	lastSundayEnd := mondayStart.Add(-time.Nanosecond)
	var lastWeekCalories float64
	var lastWeekCount int64
	config.DB.Model(&models.WorkoutSchedule{}).
		Where("user_id = ? AND status = 'COMPLETED' AND scheduled_date >= ? AND scheduled_date <= ?", userID, lastMonday, lastSundayEnd).
		Select("COUNT(*), COALESCE(SUM(burned_calories), 0)").
		Row().Scan(&lastWeekCount, &lastWeekCalories)

	// Call n8n webhook for intelligent coaching synthesis
	n8nURL := os.Getenv("N8N_WORKOUT_PLAN_WEBHOOK_URL")
	if n8nURL == "" {
		n8nURL = "https://soranut.app.n8n.cloud/webhook-test/yourpace-mentor"
	}

	prompt := fmt.Sprintf(`คุณคือ AI Health & Fitness Mentor ส่วนตัวของแอป youPace
ช่วยเขียนสรุปภาพรวมความคืบหน้าสุขภาพและให้กำลังใจรายสัปดาห์แก่ผู้ใช้ชื่อ: %s
เป้าหมายสุขภาพ: %s
สถิติสัปดาห์นี้: ออกกำลังกายสำเร็จ %d ครั้ง, เผาผลาญรวม %.0f kcal, รวมเวลา %d นาที
สถิติสัปดาห์ก่อนหน้า: ออกกำลังกาย %d ครั้ง, เผาผลาญ %.0f kcal
น้ำหนักปัจจุบัน: %.1f kg, น้ำหนักเป้าหมาย: %.1f kg

คำแนะนำในการเขียน:
1. ชมเชยความพยายามและความสม่ำเสมออย่างจริงใจและอบอุ่น
2. ชี้ให้เห็นพัฒนาการเชิงบวก (เช่น การเผาผลาญ, วินัย, หรือความต่อเนื่อง)
3. ให้ข้อคิดสั้นๆ 1-2 ข้อสำหรับการลุยต่อในสัปดาห์ถัดไป เพื่อไม่ให้ท้อและทำตามแผนต่อไปได้อย่างมีความสุข
ตอบเป็นภาษาไทย ความยาวกระชับ 3-4 ย่อหน้าสั้นๆ พร้อมจัดหัวข้อให้อ่านง่าย มีอีโมจิน่ารัก`,
		user.Username, user.FitnessGoal, thisWeekCount, thisWeekCalories, thisWeekMins, lastWeekCount, lastWeekCalories, user.Weight, user.TargetWeight)

	n8nReq := map[string]interface{}{
		"userId":          userID.String(),
		"action":          "weekly_recap",
		"message":         prompt,
		"prompt":          prompt,
		"thisWeekCount":   thisWeekCount,
		"thisWeekCal":     thisWeekCalories,
		"thisWeekMins":    thisWeekMins,
		"lastWeekCal":     lastWeekCalories,
		"user":            user,
	}

	var aiRecapText string
	reqBytes, _ := json.Marshal(n8nReq)
	client := &http.Client{Timeout: 15 * time.Second}
	if resp, err := client.Post(n8nURL, "application/json", strings.NewReader(string(reqBytes))); err == nil {
		defer resp.Body.Close()
		bodyBytes, _ := io.ReadAll(resp.Body)
		var n8nResp map[string]interface{}
		if json.Unmarshal(bodyBytes, &n8nResp) == nil {
			if reply, ok := n8nResp["output"].(string); ok && reply != "" {
				aiRecapText = reply
			} else if reply, ok := n8nResp["reply"].(string); ok && reply != "" {
				aiRecapText = reply
			}
		}
	}

	if aiRecapText == "" {
		comparisonText := "คุณกำลังสร้างรากฐานสุขภาพที่ดีขึ้นเรื่อยๆ"
		if thisWeekCalories > lastWeekCalories && lastWeekCalories > 0 {
			diff := thisWeekCalories - lastWeekCalories
			comparisonText = fmt.Sprintf("สัปดาห์นี้คุณเผาผลาญเพิ่มขึ้นจากสัปดาห์ก่อนถึง +%.0f kcal!", diff)
		} else if thisWeekCount >= 3 {
			comparisonText = "ความสม่ำเสมอของคุณในสัปดาห์นี้ยอดเยี่ยมมาก ร่างกายเริ่มปรับตัวและมีพลังงานมากขึ้นอย่างเห็นได้ชัด"
		}

		aiRecapText = fmt.Sprintf(`🌟 **สรุปภาพรวมความคืบหน้าประจำสัปดาห์**

สวัสดีครับคุณ %s! สัปดาห์นี้คุณทำกิจกรรมสำเร็จไปทั้งหมด **%d ครั้ง** เผาผลาญพลังงานรวม **%.0f kcal** (%d นาที) %s

🎯 **ข้อคิดและแรงบันดาลใจสำหรับสัปดาห์หน้า:**
• รักษาวินัยแบบค่อยเป็นค่อยไป ไม่ต้องหักโหม แค่ก้าวต่อวันละนิด
• ดื่มน้ำและพักผ่อนให้เพียงพอ เพื่อให้ร่างกายฟื้นฟูกล้ามเนื้อได้อย่างเต็มที่

youPace และ AI Mentor พร้อมเคียงข้างคุณในทุกๆ ก้าวเสมอครับ ลุยต่อด้วยกันนะ! 💪✨`,
			user.Username, thisWeekCount, thisWeekCalories, thisWeekMins, comparisonText)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"weeklyRecap":       aiRecapText,
		"thisWeekCount":     thisWeekCount,
		"thisWeekCalories":  thisWeekCalories,
		"thisWeekMins":      thisWeekMins,
		"lastWeekCalories":  lastWeekCalories,
	})
}
