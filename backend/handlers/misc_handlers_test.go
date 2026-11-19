package handlers

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"youpace/config"
	"youpace/models"
)

func TestCheckInReadEndpoints(t *testing.T) {
	setupTestDB(t)
	createUser(t, "ci@example.com", "pw", true)

	wantStatus(t, call(t, GetTodayCheckIn, http.MethodGet, "", ""), http.StatusNotFound)
	wantStatus(t, call(t, GetCheckInHistory, http.MethodGet, "", ""), http.StatusNotFound)
	wantStatus(t, call(t, GetTodayCheckIn, http.MethodGet, "", "ci@example.com"), http.StatusNoContent)

	wantStatus(t, call(t, CheckIn, http.MethodPost, `{bad`, "ci@example.com"), http.StatusBadRequest)
	wantStatus(t, call(t, CheckIn, http.MethodPost, `{"energyLevel":9,"emotionalState":3}`, "ci@example.com"), http.StatusBadRequest)
	wantStatus(t, call(t, CheckIn, http.MethodPost, `{"energyLevel":5,"emotionalState":4,"notes":"great"}`, "ci@example.com"), http.StatusOK)

	rec := call(t, GetTodayCheckIn, http.MethodGet, "", "ci@example.com")
	wantStatus(t, rec, http.StatusOK)
	var today models.EmotionalCheckIn
	decode(t, rec, &today)
	if today.AdjustedIntensity != "INTENSE" || today.Notes != "great" {
		t.Errorf("today = %+v", today)
	}

	rec = call(t, GetCheckInHistory, http.MethodGet, "", "ci@example.com")
	wantStatus(t, rec, http.StatusOK)
	var hist []models.EmotionalCheckIn
	decode(t, rec, &hist)
	if len(hist) != 1 {
		t.Errorf("history = %d entries", len(hist))
	}

	config.DB.Exec("DROP TABLE emotional_check_ins")
	wantStatus(t, call(t, GetCheckInHistory, http.MethodGet, "", "ci@example.com"), http.StatusInternalServerError)
	wantStatus(t, call(t, CheckIn, http.MethodPost, `{"energyLevel":3,"emotionalState":3}`, "ci@example.com"), http.StatusInternalServerError)
}

func TestCheckInUpdateFailure(t *testing.T) {
	setupTestDB(t)
	createUser(t, "cu@example.com", "pw", true)
	wantStatus(t, call(t, CheckIn, http.MethodPost, `{"energyLevel":2,"emotionalState":3}`, "cu@example.com"), http.StatusOK)
	config.DB.Exec(`CREATE TRIGGER ro BEFORE UPDATE ON emotional_check_ins BEGIN SELECT RAISE(ABORT, 'ro'); END`)
	wantStatus(t, call(t, CheckIn, http.MethodPost, `{"energyLevel":3,"emotionalState":3}`, "cu@example.com"), http.StatusInternalServerError)
}

func TestDashboardSummary(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "db@example.com", "pw", true)
	wantStatus(t, call(t, GetDashboardSummary, http.MethodGet, "", ""), http.StatusNotFound)

	// empty dashboard
	rec := call(t, GetDashboardSummary, http.MethodGet, "", "db@example.com")
	wantStatus(t, rec, http.StatusOK)
	var s DashboardSummary
	decode(t, rec, &s)
	if s.TotalWorkouts != 0 || s.CompletionRate != 0 || s.LatestCheckIn != nil || s.LatestMealLog != nil {
		t.Errorf("empty = %+v", s)
	}

	completedWorkout(t, u, time.Now(), 200, 30)
	addWorkout(t, u, "later", "PENDING", time.Now().AddDate(0, 0, 2))
	config.DB.Create(&models.EmotionalCheckIn{UserID: u.UserID, CheckinDate: time.Now(), EnergyLevel: 3, EmotionalState: 3, AdjustedIntensity: "MODERATE"})
	config.DB.Create(&models.MealLog{UserID: u.UserID, LogDate: time.Now(), MealDescription: "lunch", Calories: 500})

	decode(t, call(t, GetDashboardSummary, http.MethodGet, "", "db@example.com"), &s)
	if s.TotalWorkouts != 2 || s.CompletedWorkouts != 1 || s.CompletionRate != 50 || s.TotalCaloriesBurned != 200 || s.TotalDurationMins != 30 {
		t.Errorf("summary = %+v", s)
	}
	if s.LatestCheckIn == nil || s.LatestMealLog == nil || s.LatestMealLog.MealDescription != "lunch" {
		t.Errorf("latest entries missing: %+v", s)
	}
}

func TestHealthMetricsEndpoints(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "hm@example.com", "pw", true)
	config.DB.Model(&u).Updates(map[string]interface{}{"height": 170, "weight": 75, "age": 30, "gender": "MALE"})

	wantStatus(t, call(t, LogHealthMetric, http.MethodPost, `{"weight":70}`, ""), http.StatusUnauthorized)
	wantStatus(t, call(t, GetHealthLogsHistory, http.MethodGet, "", ""), http.StatusUnauthorized)
	wantStatus(t, call(t, GetHealthSummaryEndpoint, http.MethodGet, "", ""), http.StatusUnauthorized)
	wantStatus(t, call(t, LogHealthMetric, http.MethodPost, `{bad`, "hm@example.com"), http.StatusBadRequest)
	wantStatus(t, call(t, LogHealthMetric, http.MethodPost, `{"weight":0}`, "hm@example.com"), http.StatusBadRequest)

	// height comes from the profile when the request omits it
	rec := call(t, LogHealthMetric, http.MethodPost, `{"weight":72,"bodyFatPercentage":18.5,"notes":"morning"}`, "hm@example.com")
	wantStatus(t, rec, http.StatusCreated)
	var logEntry models.UserHealthLog
	decode(t, rec, &logEntry)
	if logEntry.Height != 170 || logEntry.BMI < 24.9 || logEntry.BMI > 25.0 {
		t.Errorf("log = %+v", logEntry)
	}
	if got := userByEmail(t, "hm@example.com"); got.Weight != 72 {
		t.Errorf("profile weight = %v, want 72", got.Weight)
	}

	// explicit date and height update the profile too
	wantStatus(t, call(t, LogHealthMetric, http.MethodPost, `{"weight":71,"height":171,"logDate":"2026-01-05T00:00:00Z"}`, "hm@example.com"), http.StatusCreated)
	if got := userByEmail(t, "hm@example.com"); got.Height != 171 {
		t.Errorf("profile height = %v, want 171", got.Height)
	}

	rec = call(t, GetHealthLogsHistory, http.MethodGet, "", "hm@example.com")
	wantStatus(t, rec, http.StatusOK)
	var logs []models.UserHealthLog
	decode(t, rec, &logs)
	if len(logs) != 2 {
		t.Errorf("logs = %d, want 2", len(logs))
	}

	rec = call(t, GetHealthSummaryEndpoint, http.MethodGet, "", "hm@example.com")
	wantStatus(t, rec, http.StatusOK)
	if !strings.Contains(rec.Body.String(), "bmi") && !strings.Contains(strings.ToLower(rec.Body.String()), "bmi") {
		t.Errorf("summary = %s", rec.Body.String())
	}

	config.DB.Exec("DROP TABLE user_health_logs")
	wantStatus(t, call(t, GetHealthLogsHistory, http.MethodGet, "", "hm@example.com"), http.StatusInternalServerError)
	wantStatus(t, call(t, LogHealthMetric, http.MethodPost, `{"weight":70}`, "hm@example.com"), http.StatusInternalServerError)
}

func TestWeightLogEndpoints(t *testing.T) {
	setupTestDB(t)
	createUser(t, "wl@example.com", "pw", true)
	wantStatus(t, call(t, LogWeight, http.MethodPost, `{"weight":70}`, ""), http.StatusNotFound)
	wantStatus(t, call(t, GetWeightHistory, http.MethodGet, "", ""), http.StatusNotFound)
	wantStatus(t, call(t, LogWeight, http.MethodPost, `{bad`, "wl@example.com"), http.StatusBadRequest)
	wantStatus(t, call(t, LogWeight, http.MethodPost, `{"weight":-1}`, "wl@example.com"), http.StatusBadRequest)
	wantStatus(t, call(t, LogWeight, http.MethodPost, `{"weight":70.5,"logDate":"2026-02-01"}`, "wl@example.com"), http.StatusCreated)
	wantStatus(t, call(t, LogWeight, http.MethodPost, `{"weight":70,"logDate":"garbage"}`, "wl@example.com"), http.StatusCreated)

	rec := call(t, GetWeightHistory, http.MethodGet, "", "wl@example.com")
	wantStatus(t, rec, http.StatusOK)
	var logs []models.WeightLog
	decode(t, rec, &logs)
	if len(logs) != 2 {
		t.Errorf("logs = %d, want 2", len(logs))
	}

	config.DB.Exec("DROP TABLE weight_logs")
	wantStatus(t, call(t, GetWeightHistory, http.MethodGet, "", "wl@example.com"), http.StatusInternalServerError)
	wantStatus(t, call(t, LogWeight, http.MethodPost, `{"weight":70}`, "wl@example.com"), http.StatusInternalServerError)
}

func TestWaterHistory(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "wh@example.com", "pw", true)
	wantStatus(t, call(t, GetWaterLogHistory, http.MethodGet, "", ""), http.StatusUnauthorized)

	for i := 0; i < 3; i++ {
		config.DB.Create(&models.WaterLog{UserID: u.UserID, LogDate: time.Now().AddDate(0, 0, -i), Glasses: i})
	}
	rec := call(t, GetWaterLogHistory, http.MethodGet, "", "wh@example.com")
	wantStatus(t, rec, http.StatusOK)
	var logs []models.WaterLog
	decode(t, rec, &logs)
	if len(logs) != 3 || logs[0].Glasses != 0 {
		t.Errorf("history (newest first) = %+v", logs)
	}

	config.DB.Exec("DROP TABLE water_logs")
	wantStatus(t, call(t, GetWaterLogHistory, http.MethodGet, "", "wh@example.com"), http.StatusInternalServerError)
}

func TestCatalogEndpointsReportDatabaseFailures(t *testing.T) {
	setupTestDB(t)
	createUser(t, "cat@example.com", "pw", true)
	config.DB.Create(&models.Equipment{Name: "Rope", DisplayName: "Jump rope"})
	rec := call(t, GetAllEquipments, http.MethodGet, "", "")
	wantStatus(t, rec, http.StatusOK)
	if !strings.Contains(rec.Body.String(), "Jump rope") {
		t.Errorf("body = %s", rec.Body.String())
	}

	config.DB.Exec("DROP TABLE equipment")
	config.DB.Exec("DROP TABLE exercises")
	config.DB.Exec("DROP TABLE fav_exercises")
	wantStatus(t, call(t, GetAllEquipments, http.MethodGet, "", ""), http.StatusInternalServerError)
	wantStatus(t, call(t, GetAllExercises, http.MethodGet, "", ""), http.StatusInternalServerError)
	wantStatus(t, call(t, GetFavExercises, http.MethodGet, "", "cat@example.com"), http.StatusInternalServerError)
	wantStatus(t, callWith(t, AddFavExercise, http.MethodPost, "", "cat@example.com", map[string]string{"id": "11111111-1111-1111-1111-111111111111"}), http.StatusNotFound)
	wantStatus(t, callWith(t, RemoveFavExercise, http.MethodDelete, "", "cat@example.com", map[string]string{"id": "11111111-1111-1111-1111-111111111111"}), http.StatusNotFound)
}

func TestStartReminderWorkerStopsWhenCancelled(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "rw@example.com", "pw", true)
	config.DB.Create(&models.UserSetting{UserID: u.UserID, NotificationsEnabled: true, Timezone: "UTC", DefaultNotifyTime: "00:00"})
	sent := make(chan string, 4)
	orig := reminderSender
	reminderSender = func(email, title string, minutes int) error {
		sent <- email
		return nil
	}
	t.Cleanup(func() { reminderSender = orig })
	addWorkout(t, u, "Morning", "PENDING", time.Now())

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() { StartReminderWorker(ctx, 10*time.Millisecond); close(done) }()

	select {
	case email := <-sent:
		if email != "rw@example.com" {
			t.Errorf("reminder sent to %s", email)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("worker never sent the due reminder")
	}
	cancel()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("worker did not stop after cancel")
	}
}

func TestSendDueRemindersSurvivesQueryAndSenderFailures(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "rq@example.com", "pw", true)
	config.DB.Create(&models.UserSetting{UserID: u.UserID, NotificationsEnabled: true, Timezone: "UTC", DefaultNotifyTime: "00:00"})
	addWorkout(t, u, "Early", "PENDING", time.Now())

	orig := reminderSender
	reminderSender = func(string, string, int) error { return context.DeadlineExceeded }
	t.Cleanup(func() { reminderSender = orig })
	if n := SendDueReminders(time.Now()); n != 0 {
		t.Errorf("sent %d, want 0 when the mailer fails", n)
	}
	if countRows(&models.WorkoutSchedule{}, "reminder_sent_at IS NOT NULL") != 0 {
		t.Error("a failed send must not be recorded")
	}

	config.DB.Exec("DROP TABLE user_settings")
	if n := SendDueReminders(time.Now()); n != 0 {
		t.Errorf("sent %d, want 0 when the query fails", n)
	}
}

func TestWaterLogCreationSurvivesConcurrentFirstRequests(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "race@example.com", "pw", true)
	today := time.Now().Format("2006-01-02")

	// The row already exists (another request won the race) but this request created
	// its own copy before noticing: it must adopt the existing row, not fail.
	first := createWaterLogOnce(models.WaterLog{UserID: u.UserID, LogDate: time.Now(), Glasses: 2, TargetGlasses: 8}, u.UserID, today)
	second := createWaterLogOnce(models.WaterLog{UserID: u.UserID, LogDate: time.Now(), Glasses: 0, TargetGlasses: 10}, u.UserID, today)
	if second.LogID != first.LogID || second.Glasses != 2 {
		t.Errorf("second insert should return the winner's row: first=%+v second=%+v", first, second)
	}
	if n := countRows(&models.WaterLog{}, "user_id = ?", u.UserID); n != 1 {
		t.Errorf("rows = %d, want 1", n)
	}
}
