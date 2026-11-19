package handlers

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"youpace/config"
	"youpace/models"
)

func TestChatWithMentorStoresBothSidesOfTheConversation(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "chat@example.com", "pw", true)
	fakeAI(t, `{"chatResponse":"Keep going!"}`)

	rec := call(t, ChatWithMentor, http.MethodPost, `{"message":"How do I start?"}`, "chat@example.com")
	wantStatus(t, rec, http.StatusOK)
	var body struct{ Response string }
	decode(t, rec, &body)
	if body.Response != "Keep going!" {
		t.Errorf("response = %q", body.Response)
	}

	// a second turn sends the first one back as context
	wantStatus(t, call(t, ChatWithMentor, http.MethodPost, `{"message":"And then?"}`, "chat@example.com"), http.StatusOK)
	if n := countRows(&models.ChatMessage{}, "user_id = ?", u.UserID); n != 4 {
		t.Errorf("stored messages = %d, want 4", n)
	}

	rec = call(t, GetChatHistory, http.MethodGet, "", "chat@example.com")
	wantStatus(t, rec, http.StatusOK)
	var hist struct {
		Count    int
		Messages []models.ChatMessage
	}
	decode(t, rec, &hist)
	if hist.Count != 4 || hist.Messages[0].Sender != "user" || hist.Messages[1].Sender != "ai" {
		t.Errorf("history = %+v", hist)
	}

	wantStatus(t, call(t, ClearChatHistory, http.MethodDelete, "", "chat@example.com"), http.StatusOK)
	if n := countRows(&models.ChatMessage{}, "user_id = ?", u.UserID); n != 0 {
		t.Errorf("history not cleared, %d left", n)
	}
}

func TestChatWithMentorSendsEarlierMessagesToTheModel(t *testing.T) {
	setupTestDB(t)
	createUser(t, "ctx@example.com", "pw", true)
	var prompts []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b := make([]byte, 1<<16)
		n, _ := r.Body.Read(b)
		prompts = append(prompts, string(b[:n]))
		w.Write([]byte(`{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}`))
	}))
	defer srv.Close()
	t.Setenv("GEMINI_URL", srv.URL)
	t.Setenv("GEMINI_API_KEY", "test-key")

	call(t, ChatWithMentor, http.MethodPost, `{"message":"first question"}`, "ctx@example.com")
	call(t, ChatWithMentor, http.MethodPost, `{"message":"second question"}`, "ctx@example.com")
	if len(prompts) != 2 || !strings.Contains(prompts[1], "first question") {
		t.Errorf("second prompt lacks the history: %v", prompts)
	}
}

func TestChatWithMentorErrors(t *testing.T) {
	setupTestDB(t)
	createUser(t, "ce@example.com", "pw", true)

	wantStatus(t, call(t, ChatWithMentor, http.MethodPost, `{"message":"hi"}`, ""), http.StatusNotFound)
	wantStatus(t, call(t, ChatWithMentor, http.MethodPost, `{bad`, "ce@example.com"), http.StatusBadRequest)
	wantStatus(t, call(t, ChatWithMentor, http.MethodPost, `{"message":"   "}`, "ce@example.com"), http.StatusBadRequest)

	// AI backend down: the user still gets an answer explaining the failure
	aiDown(t)
	rec := call(t, ChatWithMentor, http.MethodPost, `{"message":"hi"}`, "ce@example.com")
	wantStatus(t, rec, http.StatusOK)
	if !strings.Contains(rec.Body.String(), "[AI Error]") {
		t.Errorf("body = %s", rec.Body.String())
	}
}

func TestChatHistoryRequiresLoginAndSurvivesDBFailure(t *testing.T) {
	setupTestDB(t)
	createUser(t, "hh@example.com", "pw", true)
	wantStatus(t, call(t, GetChatHistory, http.MethodGet, "", ""), http.StatusUnauthorized)
	wantStatus(t, call(t, ClearChatHistory, http.MethodDelete, "", ""), http.StatusUnauthorized)

	config.DB.Exec("DROP TABLE chat_messages")
	wantStatus(t, call(t, GetChatHistory, http.MethodGet, "", "hh@example.com"), http.StatusInternalServerError)
	wantStatus(t, call(t, ClearChatHistory, http.MethodDelete, "", "hh@example.com"), http.StatusInternalServerError)
}

func TestCalculateBurn(t *testing.T) {
	setupTestDB(t)
	createUser(t, "burn@example.com", "pw", true)
	fakeAI(t, `{"output":"{\"light\":{\"calories\":100,\"description\":\"easy\"},\"moderate\":{\"calories\":200,\"description\":\"ok\"},\"intense\":{\"calories\":300,\"description\":\"hard\"},\"explanation\":\"METs\"}"}`)

	wantStatus(t, call(t, CalculateBurnWithN8N, http.MethodPost, `{}`, ""), http.StatusUnauthorized)
	wantStatus(t, call(t, CalculateBurnWithN8N, http.MethodPost, `{bad`, "burn@example.com"), http.StatusBadRequest)

	rec := call(t, CalculateBurnWithN8N, http.MethodPost, `{"title":"Run","durationMinutes":45}`, "burn@example.com")
	wantStatus(t, rec, http.StatusOK)
	var res CalculateBurnMultiIntensityResponse
	decode(t, rec, &res)
	if res.Light.Calories != 100 || res.Moderate.Calories != 200 || res.Intense.Calories != 300 || res.Explanation != "METs" {
		t.Errorf("res = %+v", res)
	}
}

func TestCalculateBurnFallsBackToDefaultsWhenAIIsDown(t *testing.T) {
	setupTestDB(t)
	createUser(t, "burn2@example.com", "pw", true)
	aiDown(t)
	rec := call(t, CalculateBurnWithN8N, http.MethodPost, `{}`, "burn2@example.com")
	wantStatus(t, rec, http.StatusOK)
	var res CalculateBurnMultiIntensityResponse
	decode(t, rec, &res)
	if res.Light.Calories <= 0 || res.Intense.Calories <= res.Light.Calories {
		t.Errorf("defaults not applied sensibly: %+v", res)
	}
}

const plannedReply = "Here is your plan.\n" +
	"[TIME: 20/11/2026 18:00 ถึง 19:00] [EVENT: Upper body] [INTENSITY: INTENSE] [DESC:\n- Push-ups (3 x 12)\n- Plank (3 x 30s)\nเผาผลาญประมาณ: 300 kcal]\n" +
	"[TIME: 22/11/2026 07:00 ถึง 07:30] [EVENT: Easy jog] [INTENSITY: LIGHT] [DESC:\n- Jog (1 x 30m)\nเผาผลาญประมาณ: 200 kcal]"

func TestPlanWorkoutSavesParsedSchedules(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "plan@example.com", "pw", true)
	fakeAI(t, plannedReply)

	body := `{"daysCount":2,"userNote":"no Saturdays","calendarEvents":[{"summary":"Meeting","start":{"dateTime":"2026-11-20T10:00:00+07:00"}},{"start":{"date":"2026-11-21"}}]}`
	wantStatus(t, call(t, PlanWorkoutInFreeTimeWithN8N, http.MethodPost, body, ""), http.StatusUnauthorized)
	wantStatus(t, call(t, PlanWorkoutInFreeTimeWithN8N, http.MethodPost, body, "ghost@example.com"), http.StatusUnauthorized)

	rec := call(t, PlanWorkoutInFreeTimeWithN8N, http.MethodPost, body, "plan@example.com")
	wantStatus(t, rec, http.StatusOK)
	if n := countRows(&models.WorkoutSchedule{}, "user_id = ?", u.UserID); n != 2 {
		t.Fatalf("schedules = %d, want 2", n)
	}
	var upper models.WorkoutSchedule
	config.DB.First(&upper, "user_id = ? AND title = ?", u.UserID, "Upper body")
	if upper.TargetIntensity != "INTENSE" || upper.DurationMinutes != 60 || upper.BurnedCalories != 300 {
		t.Errorf("upper = %+v", upper)
	}
	if countRows(&models.WorkoutScheduleDetail{}, "workout_schedule_id = ?", upper.ScheduleID) == 0 {
		t.Error("exercises from the description were not attached")
	}

	// planning again must not duplicate days that already have a workout (nothing new
	// parsed, so the generic fallback plan is added instead)
	wantStatus(t, call(t, PlanWorkoutInFreeTimeWithN8N, http.MethodPost, body, "plan@example.com"), http.StatusOK)
	if n := countRows(&models.WorkoutSchedule{}, "user_id = ? AND title = ?", u.UserID, "Upper body"); n != 1 {
		t.Errorf("Upper body rows after re-plan = %d, want 1", n)
	}
}

func TestPlanWorkoutFallsBackWhenReplyHasNoBlocks(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "fb@example.com", "pw", true)
	seedExercises(t)
	config.DB.Model(&u).Update("fitness_goal", "GAIN_MUSCLE")
	fakeAI(t, "Sorry, no structured plan today.")

	wantStatus(t, call(t, PlanWorkoutInFreeTimeWithN8N, http.MethodPost, `{}`, "fb@example.com"), http.StatusOK)
	var list []models.WorkoutSchedule
	config.DB.Where("user_id = ?", u.UserID).Find(&list)
	if len(list) != 3 {
		t.Fatalf("fallback should create 3 workouts, got %d", len(list))
	}
	for _, s := range list {
		if s.TargetIntensity != "INTENSE" || !strings.Contains(s.Title, "Strength") {
			t.Errorf("fallback for GAIN_MUSCLE = %+v", s)
		}
	}
}

func TestPlanWorkoutReportsAIErrorWithoutFallback(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "ai@example.com", "pw", true)
	aiDown(t)
	rec := call(t, PlanWorkoutInFreeTimeWithN8N, http.MethodPost, `{}`, "ai@example.com")
	wantStatus(t, rec, http.StatusOK)
	if !strings.Contains(rec.Body.String(), "AI Error") {
		t.Errorf("body = %s", rec.Body.String())
	}
	if n := countRows(&models.WorkoutSchedule{}, "user_id = ?", u.UserID); n != 0 {
		t.Errorf("no schedule should be created when the AI failed, got %d", n)
	}
}

func TestSmartFallbackScheduleTitlesPerGoal(t *testing.T) {
	setupTestDB(t)
	cases := map[string]string{
		"IMPROVE_ENDURANCE": "Endurance",
		"MAINTAIN_HEALTH":   "Recovery",
		"LOSE_WEIGHT":       "Fat Burn",
		"":                  "Fat Burn",
	}
	for goal, want := range cases {
		u := createUser(t, fmt.Sprintf("goal-%s@example.com", strings.ToLower(goal)), "pw", true)
		if n := generateSmartFallbackSchedule(u.UserID, models.User{FitnessGoal: goal}); n != 3 {
			t.Errorf("%s: created %d, want 3", goal, n)
		}
		var s models.WorkoutSchedule
		config.DB.First(&s, "user_id = ?", u.UserID)
		if !strings.Contains(s.Title, want) {
			t.Errorf("%s: title %q lacks %q", goal, s.Title, want)
		}
		// running it again finds every slot taken
		if n := generateSmartFallbackSchedule(u.UserID, models.User{FitnessGoal: goal}); n != 0 {
			t.Errorf("%s: second run created %d", goal, n)
		}
	}
}

func TestSaveScheduleExerciseReusesExistingExercise(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "ex@example.com", "pw", true)
	s := models.WorkoutSchedule{UserID: u.UserID, Title: "t", ScheduledDate: time.Now(), Status: "PENDING"}
	config.DB.Create(&s)

	saveScheduleExercise(s.ScheduleID, "Burpee")
	saveScheduleExercise(s.ScheduleID, "burpee")
	if n := countRows(&models.Exercise{}, "LOWER(name) = ?", "burpee"); n != 1 {
		t.Errorf("exercise rows = %d, want 1 (case-insensitive reuse)", n)
	}
	if n := countRows(&models.WorkoutScheduleDetail{}, "workout_schedule_id = ?", s.ScheduleID); n != 2 {
		t.Errorf("details = %d, want 2", n)
	}
}

func completedWorkout(t *testing.T, userID interface{}, day time.Time, cal float64, mins int) {
	t.Helper()
	var w models.WorkoutSchedule
	switch id := userID.(type) {
	case models.User:
		w.UserID = id.UserID
	}
	w.Title = "done"
	w.ScheduledDate = day
	w.Status = "COMPLETED"
	w.BurnedCalories = cal
	w.DurationMinutes = mins
	if err := config.DB.Create(&w).Error; err != nil {
		t.Fatal(err)
	}
}

func TestWeeklyRecapWithAIReply(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "rc@example.com", "pw", true)
	completedWorkout(t, u, time.Now(), 300, 40)

	fakeAI(t, "AI recap")
	rec := call(t, GenerateWeeklyHealthRecap, http.MethodGet, "", "rc@example.com")
	wantStatus(t, rec, http.StatusOK)
	if !strings.Contains(rec.Body.String(), "AI recap") {
		t.Errorf("body = %s", rec.Body.String())
	}
}

func TestWeeklyRecapFallbackText(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "rf@example.com", "pw", true)
	aiDown(t)

	wantStatus(t, call(t, GenerateWeeklyHealthRecap, http.MethodGet, "", ""), http.StatusNotFound)

	// no activity: the generic encouragement
	rec := call(t, GenerateWeeklyHealthRecap, http.MethodGet, "", "rf@example.com")
	wantStatus(t, rec, http.StatusOK)
	var res struct {
		WeeklyRecap   string
		ThisWeekCount int
	}
	decode(t, rec, &res)
	if res.ThisWeekCount != 0 || !strings.Contains(res.WeeklyRecap, "รากฐานสุขภาพ") {
		t.Errorf("res = %+v", res)
	}

	// last week lighter than this week: the comparison sentence
	loc := time.UTC
	now := time.Now().In(loc)
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	monday := time.Date(now.Year(), now.Month(), now.Day()-(weekday-1), 12, 0, 0, 0, loc)
	completedWorkout(t, u, monday.AddDate(0, 0, -3), 100, 20)
	completedWorkout(t, u, monday, 500, 60)
	rec = call(t, GenerateWeeklyHealthRecap, http.MethodGet, "", "rf@example.com")
	decode(t, rec, &res)
	if !strings.Contains(res.WeeklyRecap, "+400 kcal") {
		t.Errorf("expected comparison with last week, got %q", res.WeeklyRecap)
	}

	// three sessions this week and nothing to compare with: the consistency sentence
	u2 := createUser(t, "rf2@example.com", "pw", true)
	for i := 0; i < 3; i++ {
		completedWorkout(t, u2, monday, 100, 10)
	}
	rec = call(t, GenerateWeeklyHealthRecap, http.MethodGet, "", "rf2@example.com")
	decode(t, rec, &res)
	if !strings.Contains(res.WeeklyRecap, "ความสม่ำเสมอ") {
		t.Errorf("expected consistency message, got %q", res.WeeklyRecap)
	}
}
