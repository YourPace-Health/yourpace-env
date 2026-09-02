package main

import (
	"log"
	"os"

	"youpace/config"
	"youpace/handlers"
	"youpace/middleware"
	"youpace/models"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
)

func main() {
	// 1. Load .env environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or failed to load, using system environments.")
	}

	// 2. Initialize Database & Redis
	db := config.InitDB()
	config.InitRedis()

	// 3. Auto Migrate GORM Models
	log.Println("Running Auto-Migration for database...")
	err := db.AutoMigrate(
		&models.User{},
		&models.UserSetting{},
		&models.Exercise{},
		&models.FavExercise{},
		&models.EmotionalCheckIn{},
		&models.WorkoutSchedule{},
		&models.WorkoutScheduleDetail{},
		&models.MealLog{},
		&models.Milestone{},
		&models.Equipment{},
		&models.UserGoogleToken{},
		&models.UserHealthLog{},
		&models.WaterLog{},
		&models.WeightLog{},
		&models.ChatMessage{},
	)
	if err != nil {
		log.Fatalf("Auto-Migration failed: %v", err)
	}
	log.Println("Database Auto-Migration completed successfully")

	// 4. Seed default equipment data
	seedDefaultEquipments()

	// 5. Initialize Echo Framework
	e := echo.New()

	// Middlewares
	e.Use(echoMiddleware.Logger())
	e.Use(echoMiddleware.Recover())
	e.Use(echoMiddleware.CORSWithConfig(echoMiddleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{echo.GET, echo.PUT, echo.POST, echo.DELETE, echo.OPTIONS},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	// Static route
	e.Static("/uploads", "uploads")

	// 6. Routes
	// Public Auth Routes (No JWT middleware required)
	authGroup := e.Group("/api/auth")
	authGroup.POST("/register", handlers.Register)
	authGroup.POST("/login", handlers.Login)
	authGroup.POST("/verify-otp", handlers.VerifyOTP)
	authGroup.POST("/google", handlers.GoogleLogin)
	authGroup.POST("/request-otp", handlers.RequestOTP)
	authGroup.POST("/magic-link", handlers.RequestMagicLink)
	authGroup.POST("/verify-magic-link", handlers.VerifyMagicLink)

	// Public Google Calendar Callback (OAuth redirect from browser - no JWT required)
	e.GET("/api/calendar/callback", handlers.GoogleCalendarCallback)

	apiGroup := e.Group("/api")
	apiGroup.Use(middleware.JWTMiddleware)

	// User Profile & Settings
	apiGroup.GET("/users/profile", handlers.GetUserProfile)
	apiGroup.PUT("/users/profile", handlers.UpdateUserProfile)
	apiGroup.GET("/users/health-profile", handlers.GetUserProfile)
	apiGroup.PUT("/users/health-profile", handlers.UpdateUserProfile)
	apiGroup.GET("/users/health-summary", handlers.GetHealthSummaryEndpoint)
	apiGroup.POST("/users/health-logs", handlers.LogHealthMetric)
	apiGroup.GET("/users/health-logs", handlers.GetHealthLogsHistory)
	apiGroup.GET("/users/setting", handlers.GetUserSetting)
	apiGroup.PUT("/users/setting", handlers.UpdateUserSetting)

	// Water Intake Tracking
	apiGroup.GET("/water/today", handlers.GetTodayWaterLog)
	apiGroup.POST("/water/today", handlers.UpdateTodayWaterLog)
	apiGroup.PUT("/water/today", handlers.UpdateTodayWaterLog)
	apiGroup.GET("/water/history", handlers.GetWaterLogHistory)

	// Google Calendar Integration
	apiGroup.GET("/calendar/auth-url", handlers.GetGoogleAuthURL)
	apiGroup.GET("/calendar/status", handlers.GetCalendarStatus)
	apiGroup.DELETE("/calendar", handlers.DisconnectCalendar)
	apiGroup.GET("/calendar/events", handlers.GetGoogleCalendarEvents)
	apiGroup.DELETE("/calendar/events/workout", handlers.DeleteGoogleCalendarWorkoutEventsHandler)

	// Exercises
	apiGroup.GET("/exercises", handlers.GetAllExercises)
	apiGroup.GET("/exercises/suggest", handlers.GetSuggestedExercises)
	apiGroup.GET("/exercises/fav", handlers.GetFavExercises)
	apiGroup.POST("/exercises/fav/:id", handlers.AddFavExercise)
	apiGroup.DELETE("/exercises/fav/:id", handlers.RemoveFavExercise)
	apiGroup.GET("/equipments", handlers.GetAllEquipments)

	// Emotional Check-ins
	apiGroup.POST("/checkin", handlers.CheckIn)
	apiGroup.GET("/checkin/today", handlers.GetTodayCheckIn)
	apiGroup.GET("/checkin/history", handlers.GetCheckInHistory)

	// Schedules & Rescheduling
	apiGroup.GET("/schedules", handlers.GetSchedules)
	apiGroup.POST("/schedules/generate", handlers.GenerateWeeklySchedule)
	apiGroup.PUT("/schedules/:id/status", handlers.UpdateScheduleStatus)
	apiGroup.POST("/schedules/log-burn", handlers.LogCustomBurnWorkout)
	apiGroup.POST("/schedules/reschedule", handlers.Reschedule)
	apiGroup.DELETE("/schedules", handlers.DeleteAllSchedules)
	apiGroup.DELETE("/schedules/:id", handlers.DeleteSchedule)


	// Meals & AI Nutrition Tracker
	apiGroup.POST("/meals/log", handlers.LogMeal)
	apiGroup.POST("/meals/preview", handlers.AnalyzeMealPreview)
	apiGroup.POST("/meals/analyze-photo", handlers.AnalyzeMealPhotoPreview)
	apiGroup.GET("/meals/today", handlers.GetTodayMealsSummary)
	apiGroup.GET("/meals/history", handlers.GetMealHistory)
	apiGroup.GET("/meals/energy-balance", handlers.GetEnergyBalanceSummary)
	apiGroup.GET("/meals/weekly-analytics", handlers.GetWeeklyNutritionAnalytics)
	apiGroup.GET("/meals/coach-feedback", handlers.GetDailyNutritionCoachFeedback)
	apiGroup.DELETE("/meals/:id", handlers.DeleteMeal)

	// Health Dashboard
	apiGroup.GET("/dashboard/summary", handlers.GetDashboardSummary)

	// AI Fitness Mentor
	apiGroup.POST("/mentor/chat", handlers.ChatWithMentor)
	apiGroup.GET("/mentor/history", handlers.GetChatHistory)
	apiGroup.DELETE("/mentor/history", handlers.ClearChatHistory)
	apiGroup.POST("/mentor/n8n-plan", handlers.PlanWorkoutInFreeTimeWithN8N)
	apiGroup.POST("/mentor/calculate-burn", handlers.CalculateBurnWithN8N)
	apiGroup.GET("/mentor/weekly-recap", handlers.GenerateWeeklyHealthRecap)


	// Health Progress & Weight Tracking
	apiGroup.POST("/health/weight", handlers.LogWeight)
	apiGroup.GET("/health/weight/history", handlers.GetWeightHistory)
	apiGroup.GET("/health/progress-analytics", handlers.GetProgressAnalytics)

	// Milestones
	apiGroup.GET("/milestones", handlers.GetMilestones)

	// 7. Start Echo Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Starting youPace server on port %s...", port)
	e.Logger.Fatal(e.Start(":" + port))
}



func seedDefaultEquipments() {
	log.Println("Seeding default equipment data into database...")

	defaultEquipments := []models.Equipment{
		{Name: "Bodyweight", DisplayName: "น้ำหนักตัว (Bodyweight)", Icon: "🏃"},
		{Name: "Dumbbells", DisplayName: "ดัมเบล (Dumbbells)", Icon: "💪"},
		{Name: "Resistance Band", DisplayName: "ยางยืดแรงต้าน (Bands)", Icon: "🎗️"},
		{Name: "Treadmill", DisplayName: "ลู่วิ่ง (Treadmill)", Icon: "👟"},
		{Name: "Yoga Mat", DisplayName: "เสื่อโยคะ (Yoga Mat)", Icon: "🧘"},
		{Name: "Kettlebell", DisplayName: "เคตเทิลเบล (Kettlebell)", Icon: "🫖"},
		{Name: "Pull-up Bar", DisplayName: "บาร์โหน (Pull-up Bar)", Icon: "🪵"},
		{Name: "Foam Roller", DisplayName: "โฟมโรลเลอร์ (Foam Roller)", Icon: "🌀"},
		{Name: "Exercise Ball", DisplayName: "ลูกบอลออกกำลังกาย (Exercise Ball)", Icon: "⚽"},
		{Name: "Jump Rope", DisplayName: "เชือกกระโดด (Jump Rope)", Icon: "🪢"},
		{Name: "Bench", DisplayName: "เก้าอี้ปรับระดับ (Workout Bench)", Icon: "🪑"},
		{Name: "Barbell", DisplayName: "บาร์เบล (Barbell)", Icon: "🏋️"},
		{Name: "Smith Machine", DisplayName: "เครื่องสมิทแมชชีน (Smith Machine)", Icon: "🏋️‍♂️"},
		{Name: "Cable Machine", DisplayName: "เครื่องเคเบิล (Cable Machine)", Icon: "⛓️"},
		{Name: "Stationary Bike", DisplayName: "จักรยานออกกำลังกาย (Stationary Bike)", Icon: "🚴"},
		{Name: "Rowing Machine", DisplayName: "เครื่องกรรเชียงบก (Rowing Machine)", Icon: "🚣"},
		{Name: "Medicine Ball", DisplayName: "เมดิซินบอล (Medicine Ball)", Icon: "🏀"},
		{Name: "Ab Roller", DisplayName: "ลูกกลิ้งบริหารหน้าท้อง (Ab Roller)", Icon: "🎡"},
		{Name: "TRX", DisplayName: "สายแรงต้าน TRX (Suspension Trainer)", Icon: "⚓"},
		{Name: "Battle Rope", DisplayName: "เชือกสะบัด (Battle Rope)", Icon: "〰️"},
		{Name: "Punching Bag", DisplayName: "กระสอบทราย (Punching Bag)", Icon: "🥊"},
		{Name: "Stepper", DisplayName: "เครื่องเหยียบก้าว (Stepper)", Icon: "🪜"},
	}

	for _, eq := range defaultEquipments {
		var existing models.Equipment
		if err := config.DB.Where("name = ?", eq.Name).First(&existing).Error; err != nil {
			// Not found, create
			if err := config.DB.Create(&eq).Error; err != nil {
				log.Printf("Error seeding equipment %s: %v", eq.Name, err)
			}
		} else {
			// Found, update
			existing.DisplayName = eq.DisplayName
			existing.Icon = eq.Icon
			config.DB.Save(&existing)
		}
	}
	log.Println("Successfully seeded default equipments")
}
