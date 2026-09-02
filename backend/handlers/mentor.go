package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strconv"
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

	aiReply, err := services.CallGemini(prompt)

	var lightCal, moderateCal, intenseCal float64
	var lightDesc, moderateDesc, intenseDesc, explanation string

	if err == nil && aiReply != "" {
		// Clean JSON format
		cleanReply := strings.TrimSpace(aiReply)
		if strings.Contains(cleanReply, "```json") {
			cleanReply = strings.Split(cleanReply, "```json")[1]
			cleanReply = strings.Split(cleanReply, "```")[0]
			cleanReply = strings.TrimSpace(cleanReply)
		} else if strings.Contains(cleanReply, "```") {
			cleanReply = strings.Split(cleanReply, "```")[1]
			cleanReply = strings.Split(cleanReply, "```")[0]
			cleanReply = strings.TrimSpace(cleanReply)
		}

		var parsedResp struct {
			Light struct {
				Calories    interface{} `json:"calories"`
				Description string      `json:"description"`
			} `json:"light"`
			Moderate struct {
				Calories    interface{} `json:"calories"`
				Description string      `json:"description"`
			} `json:"moderate"`
			Intense struct {
				Calories    interface{} `json:"calories"`
				Description string      `json:"description"`
			} `json:"intense"`
			BurnedCalories interface{} `json:"burnedCalories"` // in case single cal returned
			Explanation    string      `json:"explanation"`
		}

		if err := json.Unmarshal([]byte(cleanReply), &parsedResp); err == nil {
			parseFloat := func(v interface{}) float64 {
				switch val := v.(type) {
				case float64:
					return val
				case string:
					if f, e := strconv.ParseFloat(val, 64); e == nil {
						return f
					}
				}
				return 0
			}

			lightCal = parseFloat(parsedResp.Light.Calories)
			lightDesc = parsedResp.Light.Description
			moderateCal = parseFloat(parsedResp.Moderate.Calories)
			moderateDesc = parsedResp.Moderate.Description
			intenseCal = parseFloat(parsedResp.Intense.Calories)
			intenseDesc = parsedResp.Intense.Description
			explanation = parsedResp.Explanation

			// If only single burnedCalories returned
			if moderateCal <= 0 && parsedResp.BurnedCalories != nil {
				baseCal := parseFloat(parsedResp.BurnedCalories)
				if baseCal > 0 {
					moderateCal = baseCal
					lightCal = baseCal * 0.8
					intenseCal = baseCal * 1.3
				}
			}
		}
	}

	// Fallbacks if any level is 0
	if lightCal <= 0 {
		lightCal = (3.5 * 3.5 * userWeight / 200.0) * float64(req.DurationMinutes)
	}
	if moderateCal <= 0 {
		moderateCal = (6.0 * 3.5 * userWeight / 200.0) * float64(req.DurationMinutes)
	}
	if intenseCal <= 0 {
		intenseCal = (8.5 * 3.5 * userWeight / 200.0) * float64(req.DurationMinutes)
	}

	if lightDesc == "" {
		lightDesc = "สบายๆ พูดคุยได้ต่อเนื่อง"
	}
	if moderateDesc == "" {
		moderateDesc = "เหงื่อซึม หายใจเร็วขึ้น"
	}
	if intenseDesc == "" {
		intenseDesc = "เหนื่อยหอบ ท้าทาย"
	}
	if explanation == "" {
		explanation = fmt.Sprintf("คำนวณตามมาตรฐาน METs สำหรับน้ำหนัก %.1f กก. ระยะเวลา %d นาที", userWeight, req.DurationMinutes)
	}

	return c.JSON(http.StatusOK, CalculateBurnMultiIntensityResponse{
		Light: IntensityBurnDetail{
			Calories:    lightCal,
			Description: lightDesc,
		},
		Moderate: IntensityBurnDetail{
			Calories:    moderateCal,
			Description: moderateDesc,
		},
		Intense: IntensityBurnDetail{
			Calories:    intenseCal,
			Description: intenseDesc,
		},
		Explanation: explanation,
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
	timeBlocks := strings.Split(aiReply, "[TIME:")
	if len(timeBlocks) <= 1 {
		return 0
	}

	loc, errLoc := time.LoadLocation("Asia/Bangkok")
	if errLoc != nil {
		loc = time.FixedZone("ICT", 7*3600)
	}
	today := time.Now().In(loc)
	createdCount := 0

	for idx, block := range timeBlocks[1:] {
		fullBlock := "[TIME:" + block

		reTime := regexp.MustCompile(`\[TIME:\s*([^\]]+)\]`)
		reEvent := regexp.MustCompile(`\[EVENT:\s*([^\]]+)\]`)
		reIntensity := regexp.MustCompile(`\[INTENSITY:\s*([^\]]+)\]`)

		timeMatch := reTime.FindStringSubmatch(fullBlock)
		eventMatch := reEvent.FindStringSubmatch(fullBlock)

		if len(timeMatch) < 2 || len(eventMatch) < 2 {
			continue
		}

		timeRaw := strings.TrimSpace(timeMatch[1])
		eventTitle := strings.TrimSpace(eventMatch[1])

		intensity := "MODERATE"
		intensityMatch := reIntensity.FindStringSubmatch(fullBlock)
		if len(intensityMatch) >= 2 {
			intensity = strings.ToUpper(strings.TrimSpace(intensityMatch[1]))
		}

		// Extract DESC multi-line block
		descRaw := ""
		descIdx := strings.Index(fullBlock, "[DESC:")
		if descIdx != -1 {
			descRaw = strings.TrimSpace(fullBlock[descIdx+6:])
			nextTagIdx := strings.Index(descRaw, "][TIME:")
			if nextTagIdx != -1 {
				descRaw = strings.TrimSpace(descRaw[:nextTagIdx])
			} else if strings.HasSuffix(descRaw, "]") {
				descRaw = strings.TrimSpace(descRaw[:len(descRaw)-1])
			}
		}

		workoutDate := today.AddDate(0, 0, idx)
		reDate := regexp.MustCompile(`(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})`)
		dateMatches := reDate.FindStringSubmatch(timeRaw)
		if len(dateMatches) == 4 {
			day, _ := strconv.Atoi(dateMatches[1])
			month, _ := strconv.Atoi(dateMatches[2])
			year, _ := strconv.Atoi(dateMatches[3])
			if year > 2500 {
				year -= 543
			}
			workoutDate = time.Date(year, time.Month(month), day, 10, 0, 0, 0, loc)
		}

		durationMins := 45
		reTimeRange := regexp.MustCompile(`(\d{1,2}):(\d{2})\s*(?:ถึง|-|to)\s*(\d{1,2}):(\d{2})`)
		timeMatches := reTimeRange.FindStringSubmatch(timeRaw)
		if len(timeMatches) == 5 {
			h1, _ := strconv.Atoi(timeMatches[1])
			m1, _ := strconv.Atoi(timeMatches[2])
			h2, _ := strconv.Atoi(timeMatches[3])
			m2, _ := strconv.Atoi(timeMatches[4])
			startMins := h1*60 + m1
			endMins := h2*60 + m2
			if endMins > startMins {
				durationMins = endMins - startMins
			}
			workoutDate = time.Date(workoutDate.Year(), workoutDate.Month(), workoutDate.Day(), h1, m1, 0, 0, loc)
		}

		burnedCal := 0.0
		reCal := regexp.MustCompile(`เผาผลาญประมาณ:\s*(\d+(?:\.\d+)?)`)
		calMatch := reCal.FindStringSubmatch(descRaw)
		if len(calMatch) >= 2 {
			burnedCal, _ = strconv.ParseFloat(calMatch[1], 64)
		}
		if burnedCal == 0 {
			burnedCal = float64(durationMins) * 6.5
		}

		// Avoid duplicate title on same date
		var existing models.WorkoutSchedule
		err := config.DB.Where("user_id = ? AND scheduled_date = ?", userID, workoutDate.Format("2006-01-02")).First(&existing).Error
		if err != nil {
			schedule := models.WorkoutSchedule{
				UserID:          userID,
				Title:           eventTitle,
				ScheduledDate:   workoutDate,
				DurationMinutes: durationMins,
				Status:          "PENDING",
				TargetIntensity: intensity,
				BurnedCalories:  burnedCal,
			}

			if err := config.DB.Create(&schedule).Error; err == nil {
				createdCount++

				// Create Google Calendar Workout Event if user connected Google Calendar
				go CreateGoogleCalendarWorkoutEvent(userID, schedule.Title, schedule.ScheduledDate, schedule.DurationMinutes, schedule.BurnedCalories, descRaw)

				// Extract all bulleted exercise items in descRaw (e.g. • Dumbbell Goblet Squats - ...)
				lines := strings.Split(descRaw, "\n")
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
		}
	}

	return createdCount
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
