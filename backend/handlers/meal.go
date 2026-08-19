package handlers

import (
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"youpace/config"
	"youpace/models"
	"youpace/services"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type MealLogRequest struct {
	MealType        string   `json:"mealType"`        // BREAKFAST, LUNCH, DINNER, SNACK
	MealDescription string   `json:"mealDescription" validate:"required"`
	Calories        *float64 `json:"calories"`
	Protein         *float64 `json:"protein"`
	Carbs           *float64 `json:"carbs"`
	Fat             *float64 `json:"fat"`
}

type MealAnalysisPreviewRequest struct {
	MealDescription string `json:"mealDescription" validate:"required"`
}

type TodayNutritionSummary struct {
	Date           string           `json:"date"`
	TotalCalories  float64          `json:"totalCalories"`
	TotalProtein   float64          `json:"totalProtein"`
	TotalCarbs     float64          `json:"totalCarbs"`
	TotalFat       float64          `json:"totalFat"`
	TargetCalories int              `json:"targetCalories"`
	TargetProtein  float64          `json:"targetProtein"`
	TargetCarbs    float64          `json:"targetCarbs"`
	TargetFat      float64          `json:"targetFat"`
	Meals          []models.MealLog `json:"meals"`
}

// AnalyzeMealPreview previews the nutrition breakdown without saving to DB
func AnalyzeMealPreview(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var req MealAnalysisPreviewRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if req.MealDescription == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "mealDescription is required"})
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	goal := user.FitnessGoal
	if goal == "" {
		goal = "Maintain General Health"
	}

	analysis, err := services.AnalyzeMealStructured(req.MealDescription, goal)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "ไม่สามารถวิเคราะห์อาหารได้ในขณะนี้: " + err.Error()})
	}

	return c.JSON(http.StatusOK, analysis)
}

func LogMeal(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var req MealLogRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if req.MealDescription == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "mealDescription is required"})
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	goal := user.FitnessGoal
	if goal == "" {
		goal = "Maintain General Health"
	}

	mealType := req.MealType
	if mealType == "" {
		mealType = "LUNCH"
	}

	var cal, pro, carb, fat float64
	var healthScore int = 80
	var summaryText string

	// If calories were provided from client preview, use them; otherwise analyze now with AI
	if req.Calories != nil && *req.Calories > 0 {
		cal = *req.Calories
		if req.Protein != nil { pro = *req.Protein }
		if req.Carbs != nil { carb = *req.Carbs }
		if req.Fat != nil { fat = *req.Fat }
		summaryText = "บันทึกข้อมูลโภชนาการเรียบร้อยแล้ว"
	} else {
		analysis, err := services.AnalyzeMealStructured(req.MealDescription, goal)
		if err == nil && analysis != nil {
			cal = analysis.Calories
			pro = analysis.Protein
			carb = analysis.Carbs
			fat = analysis.Fat
			healthScore = analysis.HealthScore
			summaryText = analysis.Summary + " | คำแนะนำ: " + analysis.Tips
		} else {
			summaryText = "บันทึกมื้ออาหารทั่วไป"
		}
	}

	logEntry := models.MealLog{
		UserID:          userID,
		LogDate:         time.Now(),
		MealType:        mealType,
		MealDescription: req.MealDescription,
		Calories:        cal,
		Protein:         pro,
		Carbs:           carb,
		Fat:             fat,
		HealthScore:     healthScore,
		AISummary:       summaryText,
	}

	if err := config.DB.Create(&logEntry).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to log meal"})
	}

	return c.JSON(http.StatusCreated, logEntry)
}

func GetTodayMealsSummary(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	now := time.Now()
	todayStr := now.Format("2006-01-02")

	var meals []models.MealLog
	if err := config.DB.Where("user_id = ? AND DATE(log_date) = ?", userID, todayStr).
		Order("log_date asc").
		Find(&meals).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve today meals"})
	}

	var totalCal, totalPro, totalCarb, totalFat float64
	for _, m := range meals {
		totalCal += m.Calories
		totalPro += m.Protein
		totalCarb += m.Carbs
		totalFat += m.Fat
	}

	healthSummary := services.ComputeHealthSummary(&user)

	targetCal := healthSummary.RecommendedCalories
	targetPro := float64(healthSummary.TargetProteinGrams)
	targetCarb := float64(healthSummary.TargetCarbsGrams)
	targetFat := float64(healthSummary.TargetFatGrams)

	res := TodayNutritionSummary{
		Date:           todayStr,
		TotalCalories:  math.Round(totalCal*10) / 10,
		TotalProtein:   math.Round(totalPro*10) / 10,
		TotalCarbs:     math.Round(totalCarb*10) / 10,
		TotalFat:       math.Round(totalFat*10) / 10,
		TargetCalories: targetCal,
		TargetProtein:  math.Round(targetPro*10) / 10,
		TargetCarbs:    math.Round(targetCarb*10) / 10,
		TargetFat:      math.Round(targetFat*10) / 10,
		Meals:          meals,
	}

	return c.JSON(http.StatusOK, res)
}

func GetMealHistory(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var meals []models.MealLog
	if err := config.DB.Where("user_id = ?", userID).Order("log_date desc").Limit(50).Find(&meals).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve meal history"})
	}

	return c.JSON(http.StatusOK, meals)
}

func DeleteMeal(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	mealIDStr := c.Param("id")
	mealID, err := uuid.Parse(mealIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid meal id"})
	}

	if err := config.DB.Where("meal_id = ? AND user_id = ?", mealID, userID).Delete(&models.MealLog{}).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to delete meal"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "meal deleted successfully"})
}

type MealPhotoAnalysisRequest struct {
	ImageData string `json:"imageData" validate:"required"` // Base64 encoded image string
	MimeType  string `json:"mimeType"`                     // e.g. "image/jpeg", "image/png"
}

func AnalyzeMealPhotoPreview(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var req MealPhotoAnalysisRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if req.ImageData == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "imageData is required"})
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	goal := user.FitnessGoal
	if goal == "" {
		goal = "Maintain General Health"
	}

	// Clean base64 prefix if present (e.g. data:image/jpeg;base64,...)
	b64 := req.ImageData
	if commaIdx := strings.Index(b64, ","); commaIdx != -1 {
		b64 = b64[commaIdx+1:]
	}

	analysis, err := services.AnalyzeMealPhoto(b64, req.MimeType, goal)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "ไม่สามารถวิเคราะห์ภาพอาหารได้ในขณะนี้: " + err.Error()})
	}

	return c.JSON(http.StatusOK, analysis)
}

type EnergyBalanceSummary struct {
	Date                string  `json:"date"`
	CaloriesIn          float64 `json:"caloriesIn"`          // Total calories consumed today
	CaloriesBurned      float64 `json:"caloriesBurned"`      // Exercise & workout burned
	NetCalories         float64 `json:"netCalories"`         // CaloriesIn - CaloriesBurned
	TargetCalories      int     `json:"targetCalories"`      // Budget for the day
	DeficitToday        float64 `json:"deficitToday"`        // How much deficit achieved vs TDEE
	TDEE                float64 `json:"tdee"`
	StatusMessage       string  `json:"statusMessage"`       // "อยู่ในเป้าหมาย Deficit", "แคลอรี่เกินเล็กน้อย"
}

func GetEnergyBalanceSummary(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	now := time.Now()
	todayStr := now.Format("2006-01-02")

	// 1. Calories In
	var meals []models.MealLog
	config.DB.Where("user_id = ? AND DATE(log_date) = ?", userID, todayStr).Find(&meals)
	var caloriesIn float64
	for _, m := range meals {
		caloriesIn += m.Calories
	}

	// 2. Calories Burned from completed workouts
	var schedules []models.WorkoutSchedule
	config.DB.Where("user_id = ? AND DATE(scheduled_date) = ? AND status = 'COMPLETED'", userID, todayStr).Find(&schedules)
	var caloriesBurned float64
	for _, s := range schedules {
		if s.BurnedCalories > 0 {
			caloriesBurned += float64(s.BurnedCalories)
		} else {
			caloriesBurned += 250.0 // Average workout burn fallback
		}
	}

	healthSummary := services.ComputeHealthSummary(&user)
	tdee := healthSummary.TDEE
	targetCal := healthSummary.RecommendedCalories

	netCalories := caloriesIn - caloriesBurned
	actualDeficit := tdee - netCalories

	status := "อยู่ในสภาวะสมดุลพลังงานที่ดี"
	if user.FitnessGoal == "LOSE_WEIGHT" {
		if actualDeficit >= 400 {
			status = "🔥 คุณอยู่ในสภาวะ Calorie Deficit ที่ยอดเยี่ยมตามเป้าหมาย!"
		} else if actualDeficit > 0 {
			status = "⚡ คุณอยู่ในสภาวะ Deficit ระดับปานกลาง กำลังไปได้สวย!"
		} else {
			status = "⚠️ วันนี้พลังงานสุทธิเริ่มเกินเกณฑ์ Deficit แนะนำเพิ่มการเคลื่อนไหวหรือเดินย่อยอาหารครับ"
		}
	} else if user.FitnessGoal == "GAIN_MUSCLE" {
		if netCalories >= float64(targetCal)-150 {
			status = "💪 ได้รับพลังงานเพียงพอสำหรับการฟื้นฟูและสร้างกล้ามเนื้อ!"
		} else {
			status = "⚠️ แคลอรี่ยังต่ำกว่าเป้าหมายเพิ่มกล้ามเนื้อ แนะนำเพิ่มมื้อของว่างที่มีโปรตีนครับ"
		}
	}

	res := EnergyBalanceSummary{
		Date:           todayStr,
		CaloriesIn:     math.Round(caloriesIn*10) / 10,
		CaloriesBurned: math.Round(caloriesBurned*10) / 10,
		NetCalories:    math.Round(netCalories*10) / 10,
		TargetCalories: targetCal,
		DeficitToday:   math.Round(actualDeficit*10) / 10,
		TDEE:           math.Round(tdee*10) / 10,
		StatusMessage:  status,
	}

	return c.JSON(http.StatusOK, res)
}

type DailyNutritionPoint struct {
	Date           string  `json:"date"`
	DayName        string  `json:"dayName"`
	CaloriesIn     float64 `json:"caloriesIn"`
	CaloriesBurned float64 `json:"caloriesBurned"`
	NetCalories    float64 `json:"netCalories"`
	TargetCalories int     `json:"targetCalories"`
	ProteinG       float64 `json:"proteinG"`
	CarbsG         float64 `json:"carbsG"`
	FatG           float64 `json:"fatG"`
}

type WeeklyNutritionAnalytics struct {
	DailyPoints       []DailyNutritionPoint `json:"dailyPoints"`
	AvgDailyCalories  float64               `json:"avgDailyCalories"`
	AvgDailyProtein   float64               `json:"avgDailyProtein"`
	AvgDailyCarbs     float64               `json:"avgDailyCarbs"`
	AvgDailyFat       float64               `json:"avgDailyFat"`
	MacroDistribution struct {
		ProteinPct float64 `json:"proteinPct"`
		CarbsPct   float64 `json:"carbsPct"`
		FatPct     float64 `json:"fatPct"`
	} `json:"macroDistribution"`
	WeeklyDeficitTotal     float64 `json:"weeklyDeficitTotal"`
	ProjectedWeightLossKg float64 `json:"projectedWeightLossKg"`
}

func GetWeeklyNutritionAnalytics(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	healthSummary := services.ComputeHealthSummary(&user)
	targetCal := healthSummary.RecommendedCalories

	dayNamesTh := []string{"อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."}

	dailyPoints := make([]DailyNutritionPoint, 7)
	var sumCal, sumPro, sumCarb, sumFat, sumBurned float64

	now := time.Now()
	for i := 6; i >= 0; i-- {
		dayTime := now.AddDate(0, 0, -i)
		dateStr := dayTime.Format("2006-01-02")
		weekdayIdx := int(dayTime.Weekday())
		dayLabel := dayNamesTh[weekdayIdx]

		var meals []models.MealLog
		config.DB.Where("user_id = ? AND DATE(log_date) = ?", userID, dateStr).Find(&meals)

		var dayCal, dayPro, dayCarb, dayFat float64
		for _, m := range meals {
			dayCal += m.Calories
			dayPro += m.Protein
			dayCarb += m.Carbs
			dayFat += m.Fat
		}

		var schedules []models.WorkoutSchedule
		config.DB.Where("user_id = ? AND DATE(scheduled_date) = ? AND status = 'COMPLETED'", userID, dateStr).Find(&schedules)
		var dayBurned float64
		for _, s := range schedules {
			if s.BurnedCalories > 0 {
				dayBurned += float64(s.BurnedCalories)
			} else {
				dayBurned += 250.0
			}
		}

		point := DailyNutritionPoint{
			Date:           dateStr,
			DayName:        dayLabel,
			CaloriesIn:     math.Round(dayCal*10) / 10,
			CaloriesBurned: math.Round(dayBurned*10) / 10,
			NetCalories:    math.Round((dayCal-dayBurned)*10) / 10,
			TargetCalories: targetCal,
			ProteinG:       math.Round(dayPro*10) / 10,
			CarbsG:         math.Round(dayCarb*10) / 10,
			FatG:           math.Round(dayFat*10) / 10,
		}

		dailyPoints[6-i] = point
		sumCal += dayCal
		sumPro += dayPro
		sumCarb += dayCarb
		sumFat += dayFat
		sumBurned += dayBurned
	}

	avgCal := sumCal / 7.0
	avgPro := sumPro / 7.0
	avgCarb := sumCarb / 7.0
	avgFat := sumFat / 7.0

	// Calculate Macro calories: Protein=4kcal/g, Carbs=4kcal/g, Fat=9kcal/g
	proKcal := avgPro * 4.0
	carbKcal := avgCarb * 4.0
	fatKcal := avgFat * 9.0
	totalMacroKcal := proKcal + carbKcal + fatKcal

	var proPct, carbPct, fatPct float64
	if totalMacroKcal > 0 {
		proPct = math.Round((proKcal/totalMacroKcal)*1000) / 10
		carbPct = math.Round((carbKcal/totalMacroKcal)*1000) / 10
		fatPct = math.Round((fatKcal/totalMacroKcal)*1000) / 10
	} else {
		proPct = 30.0
		carbPct = 45.0
		fatPct = 25.0
	}

	weeklyTDEE := healthSummary.TDEE * 7.0
	weeklyNet := sumCal - sumBurned
	weeklyDeficit := weeklyTDEE - weeklyNet
	projectedLossKg := 0.0
	if weeklyDeficit > 0 {
		projectedLossKg = math.Round((weeklyDeficit/7700.0)*100) / 100
	}

	res := WeeklyNutritionAnalytics{
		DailyPoints:           dailyPoints,
		AvgDailyCalories:      math.Round(avgCal*10) / 10,
		AvgDailyProtein:       math.Round(avgPro*10) / 10,
		AvgDailyCarbs:         math.Round(avgCarb*10) / 10,
		AvgDailyFat:           math.Round(avgFat*10) / 10,
		WeeklyDeficitTotal:    math.Round(weeklyDeficit*10) / 10,
		ProjectedWeightLossKg: projectedLossKg,
	}
	res.MacroDistribution.ProteinPct = proPct
	res.MacroDistribution.CarbsPct = carbPct
	res.MacroDistribution.FatPct = fatPct

	return c.JSON(http.StatusOK, res)
}

func GetDailyNutritionCoachFeedback(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	now := time.Now()
	todayStr := now.Format("2006-01-02")

	var meals []models.MealLog
	config.DB.Where("user_id = ? AND DATE(log_date) = ?", userID, todayStr).Find(&meals)

	var caloriesIn, totalPro, totalCarb, totalFat float64
	mealSummaryText := ""
	for idx, m := range meals {
		caloriesIn += m.Calories
		totalPro += m.Protein
		totalCarb += m.Carbs
		totalFat += m.Fat
		mealSummaryText += fmt.Sprintf("มื้อที่ %d (%s): %s (%.0f kcal, P:%.1fg, C:%.1fg, F:%.1fg)\n",
			idx+1, m.MealType, m.MealDescription, m.Calories, m.Protein, m.Carbs, m.Fat)
	}

	if len(meals) == 0 {
		mealSummaryText = "ยังไม่มีการบันทึกมื้ออาหารในวันนี้"
	}

	var schedules []models.WorkoutSchedule
	config.DB.Where("user_id = ? AND DATE(scheduled_date) = ? AND status = 'COMPLETED'", userID, todayStr).Find(&schedules)
	var caloriesBurned float64
	for _, s := range schedules {
		if s.BurnedCalories > 0 {
			caloriesBurned += float64(s.BurnedCalories)
		} else {
			caloriesBurned += 250.0
		}
	}

	healthSummary := services.ComputeHealthSummary(&user)
	targetCal := healthSummary.RecommendedCalories

	feedback, err := services.GenerateDailyNutritionFeedback(mealSummaryText, user.FitnessGoal, caloriesIn, targetCal, caloriesBurned)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to generate coach feedback"})
	}

	return c.JSON(http.StatusOK, feedback)
}

