package handlers

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"youpace/config"
	"youpace/models"
)

func TestCalculateLevelInfoBoundaries(t *testing.T) {
	cases := []struct {
		exp      int
		code     string
		next     int
		progress float64
	}{
		{0, "R1", 500, 0},
		{250, "R1", 500, 50},
		{500, "R2", 1500, 0},
		{2000, "R3", 3500, 25},
		{5000, "R4", 7000, 42.9},
		{7000, "R5", 15000, 0},
		{99999, "R5", 15000, 100},
		{-50, "R1", 500, 0},
	}
	for _, tc := range cases {
		got := calculateLevelInfo(tc.exp)
		if got.LevelCode != tc.code || got.NextLevelEXP != tc.next || got.ProgressPercentage != tc.progress || got.CurrentEXP != tc.exp {
			t.Errorf("exp %d: %+v", tc.exp, got)
		}
	}
}

func TestProgressAnalyticsForABusyUser(t *testing.T) {
	setupTestDB(t)
	target := time.Now().AddDate(0, 0, 70)
	u := createUser(t, "pa@example.com", "pw", true)
	config.DB.Model(&u).Updates(map[string]interface{}{"weight": 80, "height": 175, "target_weight": 72, "target_date": target})

	now := time.Now()
	for i := 0; i < 4; i++ { // today and the three days before it: a 4 day streak
		completedWorkout(t, u, now.AddDate(0, 0, -i), 400, 45)
	}
	config.DB.Create(&models.WeightLog{UserID: u.UserID, Weight: 85, LogDate: now.AddDate(0, 0, -20)})
	config.DB.Create(&models.WeightLog{UserID: u.UserID, Weight: 79, LogDate: now.AddDate(0, 0, -1)})

	wantStatus(t, call(t, GetProgressAnalytics, http.MethodGet, "", ""), http.StatusNotFound)
	rec := call(t, GetProgressAnalytics, http.MethodGet, "", "pa@example.com")
	wantStatus(t, rec, http.StatusOK)

	var res ProgressAnalyticsResponse
	decode(t, rec, &res)
	if res.TotalWorkoutsCompleted != 4 || res.TotalCaloriesAllTime != 1600 {
		t.Errorf("totals = %d / %v", res.TotalWorkoutsCompleted, res.TotalCaloriesAllTime)
	}
	if res.CurrentStreakDays != 4 {
		t.Errorf("streak = %d, want 4", res.CurrentStreakDays)
	}
	if len(res.WeeklyStats) != 7 || len(res.ActivityHeatmap) != 30 {
		t.Errorf("shape: %d weekly, %d heatmap", len(res.WeeklyStats), len(res.ActivityHeatmap))
	}
	active := 0
	for _, d := range res.ActivityHeatmap {
		if d.Active {
			active++
		}
	}
	if active != 4 {
		t.Errorf("active heatmap days = %d, want 4", active)
	}
	w := res.WeightProgress
	if w.StartWeight != 85 || w.CurrentWeight != 79 || w.WeightChange != -6 || w.RemainingToTarget != 7 || w.TargetWeight != 72 {
		t.Errorf("weight progress = %+v", w)
	}
	if w.DaysRemaining < 69 || w.PaceKgPerWeek <= 0 || w.BMI == 0 {
		t.Errorf("pace/bmi = %+v", w)
	}
	// 4 workouts * 100 + 1600 kcal * 0.2
	if res.LevelInfo.CurrentEXP != 720 || res.LevelInfo.LevelCode != "R2" {
		t.Errorf("level = %+v", res.LevelInfo)
	}
}

func TestProgressAnalyticsBMICategories(t *testing.T) {
	setupTestDB(t)
	cases := []struct {
		weight float64
		want   string
	}{
		{50, "Underweight"},
		{65, "Normal"},
		{71, "Overweight"},
		{80, "Obese Class I"},
		{100, "Obese Class II"},
	}
	for i, tc := range cases {
		email := "bmi" + string(rune('a'+i)) + "@example.com"
		u := createUser(t, email, "pw", true)
		config.DB.Model(&u).Updates(map[string]interface{}{"weight": tc.weight, "height": 170})
		rec := call(t, GetProgressAnalytics, http.MethodGet, "", email)
		wantStatus(t, rec, http.StatusOK)
		var res ProgressAnalyticsResponse
		decode(t, rec, &res)
		if !strings.Contains(res.WeightProgress.BMICategory, tc.want) {
			t.Errorf("weight %v: category %q, want %q", tc.weight, res.WeightProgress.BMICategory, tc.want)
		}
	}
}

func TestProgressAnalyticsNewUser(t *testing.T) {
	setupTestDB(t)
	createUser(t, "newbie@example.com", "pw", true)
	rec := call(t, GetProgressAnalytics, http.MethodGet, "", "newbie@example.com")
	wantStatus(t, rec, http.StatusOK)
	var res ProgressAnalyticsResponse
	decode(t, rec, &res)
	if res.CurrentStreakDays != 0 || res.LevelInfo.LevelCode != "R1" || res.WeightProgress.BMICategory == "" {
		t.Errorf("res = %+v", res)
	}
}

func TestBestStreakEstimateForSeveralCompletions(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "bs@example.com", "pw", true)
	for i := 0; i < 5; i++ { // scattered, so no current streak
		completedWorkout(t, u, time.Now().AddDate(0, 0, -(i*3 + 2)), 100, 20)
	}
	var res ProgressAnalyticsResponse
	decode(t, call(t, GetProgressAnalytics, http.MethodGet, "", "bs@example.com"), &res)
	if res.CurrentStreakDays != 0 || res.BestStreakDays != 5 {
		t.Errorf("current=%d best=%d", res.CurrentStreakDays, res.BestStreakDays)
	}
}

// ---- schedules ----

func TestGetSchedulesFillsInMissingBurnEstimates(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "gs@example.com", "pw", true)
	ex := seedExercises(t)
	var first models.Exercise
	for _, e := range ex {
		first = e
		break
	}
	s := models.WorkoutSchedule{UserID: u.UserID, Title: "Plan", ScheduledDate: time.Now(), DurationMinutes: 20, Status: "PENDING"}
	config.DB.Create(&s)
	config.DB.Create(&models.WorkoutScheduleDetail{WorkoutScheduleID: s.ScheduleID, ExerciseID: first.ExerciseID, Sets: 3, Reps: 10})
	// a second schedule whose exercise has no burn rate falls back to 6 kcal/min
	noRate := models.Exercise{Name: "Stretch", BurnRate: 0}
	config.DB.Create(&noRate)
	s2 := models.WorkoutSchedule{UserID: u.UserID, Title: "Cool", ScheduledDate: time.Now().AddDate(0, 0, 1), DurationMinutes: 10, Status: "PENDING"}
	config.DB.Create(&s2)
	config.DB.Create(&models.WorkoutScheduleDetail{WorkoutScheduleID: s2.ScheduleID, ExerciseID: noRate.ExerciseID})

	wantStatus(t, call(t, GetSchedules, http.MethodGet, "", ""), http.StatusNotFound)
	rec := call(t, GetSchedules, http.MethodGet, "", "gs@example.com")
	wantStatus(t, rec, http.StatusOK)
	var list []models.WorkoutSchedule
	decode(t, rec, &list)
	if len(list) != 2 {
		t.Fatalf("got %d schedules", len(list))
	}
	if list[0].BurnedCalories != 20*first.BurnRate {
		t.Errorf("estimate = %v, want %v", list[0].BurnedCalories, 20*first.BurnRate)
	}
	if list[1].BurnedCalories != 60 {
		t.Errorf("fallback estimate = %v, want 60", list[1].BurnedCalories)
	}
	var stored models.WorkoutSchedule
	config.DB.First(&stored, "schedule_id = ?", s.ScheduleID)
	if stored.BurnedCalories == 0 {
		t.Error("the estimate should be persisted")
	}

	config.DB.Exec("DROP TABLE workout_schedule_details")
	wantStatus(t, call(t, GetSchedules, http.MethodGet, "", "gs@example.com"), http.StatusInternalServerError)
}

func TestGenerateWeeklySchedule(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "gw@example.com", "pw", true)
	config.DB.Model(&u).Update("fitness_goal", "LOSE_WEIGHT")

	wantStatus(t, call(t, GenerateWeeklySchedule, http.MethodPost, "", ""), http.StatusNotFound)
	wantStatus(t, call(t, GenerateWeeklySchedule, http.MethodPost, "", "gw@example.com"), http.StatusBadRequest) // no exercises yet

	seedExercises(t)
	rec := call(t, GenerateWeeklySchedule, http.MethodPost, "", "gw@example.com")
	wantStatus(t, rec, http.StatusCreated)
	if n := countRows(&models.WorkoutSchedule{}, "user_id = ?", u.UserID); n != 3 {
		t.Fatalf("schedules = %d, want 3", n)
	}
	if countRows(&models.WorkoutScheduleDetail{}, "1 = 1") == 0 {
		t.Error("generated schedules have no exercises")
	}

	// the days are now taken, a second run adds nothing
	wantStatus(t, call(t, GenerateWeeklySchedule, http.MethodPost, "", "gw@example.com"), http.StatusCreated)
	if n := countRows(&models.WorkoutSchedule{}, "user_id = ?", u.UserID); n != 3 {
		t.Errorf("schedules after second run = %d, want 3", n)
	}

	config.DB.Exec("DROP TABLE exercises")
	wantStatus(t, call(t, GenerateWeeklySchedule, http.MethodPost, "", "gw@example.com"), http.StatusInternalServerError)
}

func TestRescheduleMovesMissedWorkoutsToFreeDays(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "rs@example.com", "pw", true)
	wantStatus(t, call(t, Reschedule, http.MethodPost, "", ""), http.StatusNotFound)

	rec := call(t, Reschedule, http.MethodPost, "", "rs@example.com")
	wantStatus(t, rec, http.StatusOK)
	if !strings.Contains(rec.Body.String(), "no workouts need rescheduling") {
		t.Errorf("body = %s", rec.Body.String())
	}

	today := time.Now()
	addWorkout(t, u, "missed A", "MISSED", today.AddDate(0, 0, -3))
	addWorkout(t, u, "pending B", "PENDING", today)
	addWorkout(t, u, "done", "COMPLETED", today.AddDate(0, 0, -1)) // untouched
	addWorkout(t, u, "tomorrow", "PENDING", today.AddDate(0, 0, 1))

	rec = call(t, Reschedule, http.MethodPost, "", "rs@example.com")
	wantStatus(t, rec, http.StatusOK)
	var res struct{ RescheduledCount int }
	decode(t, rec, &res)
	if res.RescheduledCount != 2 {
		t.Fatalf("rescheduled = %d, want 2", res.RescheduledCount)
	}
	var moved []models.WorkoutSchedule
	config.DB.Where("status = ?", "RESCHEDULED").Find(&moved)
	if len(moved) != 2 {
		t.Fatalf("moved = %d", len(moved))
	}
	seen := map[string]bool{"tomorrow": true}
	tomorrow := today.AddDate(0, 0, 1).Format("2006-01-02")
	for _, m := range moved {
		d := m.ScheduledDate.Format("2006-01-02")
		if d <= today.Format("2006-01-02") || d == tomorrow || seen[d] {
			t.Errorf("%s moved to %s (taken or in the past)", m.Title, d)
		}
		seen[d] = true
	}

	config.DB.Exec("DROP TABLE workout_schedules")
	wantStatus(t, call(t, Reschedule, http.MethodPost, "", "rs@example.com"), http.StatusInternalServerError)
}

func TestScheduleHandlersRejectAnonymousCallers(t *testing.T) {
	setupTestDB(t)
	id := map[string]string{"id": "11111111-1111-1111-1111-111111111111"}
	wantStatus(t, callWith(t, UpdateScheduleStatus, http.MethodPut, `{"status":"COMPLETED"}`, "", id), http.StatusNotFound)
	wantStatus(t, callWith(t, UpdateScheduleStatus, http.MethodPut, `{bad`, "", id), http.StatusBadRequest)
	wantStatus(t, callWith(t, UpdateScheduleStatus, http.MethodPut, `{}`, "", map[string]string{"id": "nope"}), http.StatusBadRequest)
	wantStatus(t, call(t, LogCustomBurnWorkout, http.MethodPost, `{}`, ""), http.StatusNotFound)
	wantStatus(t, call(t, DeleteAllSchedules, http.MethodDelete, "", ""), http.StatusNotFound)
	wantStatus(t, callWith(t, DeleteSchedule, http.MethodDelete, "", "", id), http.StatusNotFound)

	createUser(t, "sa@example.com", "pw", true)
	wantStatus(t, call(t, LogCustomBurnWorkout, http.MethodPost, `{bad`, "sa@example.com"), http.StatusBadRequest)
	wantStatus(t, callWith(t, UpdateScheduleStatus, http.MethodPut, `{"status":"COMPLETED"}`, "sa@example.com", id), http.StatusNotFound)
	wantStatus(t, callWith(t, DeleteSchedule, http.MethodDelete, "", "sa@example.com", id), http.StatusNotFound)
	wantStatus(t, callWith(t, DeleteSchedule, http.MethodDelete, "", "sa@example.com", map[string]string{"id": "bad"}), http.StatusBadRequest)
}

func TestLogCustomBurnDateFormatsAndDefaults(t *testing.T) {
	setupTestDB(t)
	createUser(t, "lb@example.com", "pw", true)

	// no details at all: defaults for title, duration, calories
	s := logBurn(t, "lb@example.com", `{"skipGoogleCalendar":true}`)
	if s.DurationMinutes != 30 || s.BurnedCalories != 180 || s.TargetIntensity != "MODERATE" || !strings.Contains(s.Title, "Manual") {
		t.Errorf("defaults = %+v", s)
	}

	cases := []struct {
		name, body, wantDate string
	}{
		{"date and hh:mm", `{"scheduledDate":"2026-03-04","scheduledTime":"06:30","skipGoogleCalendar":true}`, "2026-03-04"},
		{"date and hh:mm:ss", `{"scheduledDate":"2026-03-05","scheduledTime":"06:30:15","skipGoogleCalendar":true}`, "2026-03-05"},
		{"date only", `{"scheduledDate":"2026-03-06","skipGoogleCalendar":true}`, "2026-03-06"},
		{"time not given", `{"scheduledDate":"2026-03-07","scheduledTime":"  ","skipGoogleCalendar":true}`, "2026-03-07"},
		{"rfc3339", `{"scheduledDate":"2026-03-08T10:00:00Z","skipGoogleCalendar":true}`, "2026-03-08"},
		{"garbage keeps now", `{"scheduledDate":"someday","skipGoogleCalendar":true}`, time.Now().In(time.FixedZone("ICT", 7*3600)).Format("2006-01-02")},
	}
	for _, tc := range cases {
		got := logBurn(t, "lb@example.com", tc.body)
		if d := got.ScheduledDate.Format("2006-01-02"); d != tc.wantDate {
			t.Errorf("%s: date = %s, want %s", tc.name, d, tc.wantDate)
		}
	}

	config.DB.Exec("DROP TABLE workout_schedules")
	wantStatus(t, call(t, LogCustomBurnWorkout, http.MethodPost, `{}`, "lb@example.com"), http.StatusInternalServerError)
}

func TestLogCustomBurnPushesToGoogleCalendar(t *testing.T) {
	setupTestDB(t)
	createUser(t, "lg@example.com", "pw", true)
	connectCalendar(t, "lg@example.com", time.Now().Add(time.Hour))
	posted := make(chan string, 1)
	fakeGoogle(t, func(w http.ResponseWriter, r *http.Request) {
		select {
		case posted <- r.URL.Path:
		default:
		}
		w.WriteHeader(200)
	})
	logBurn(t, "lg@example.com", `{"title":"Swim"}`)
	select {
	case p := <-posted:
		if !strings.Contains(p, "/calendar/v3/calendars/primary/events") {
			t.Errorf("path = %s", p)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("no calendar event was created")
	}
}

func TestUpdateScheduleStatusCalculatesBurnAndAwardsMilestone(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "us@example.com", "pw", true)
	ex := models.Exercise{Name: "Row", BurnRate: 8}
	config.DB.Create(&ex)
	s := models.WorkoutSchedule{UserID: u.UserID, Title: "Cardio", ScheduledDate: time.Now(), DurationMinutes: 30, Status: "PENDING"}
	config.DB.Create(&s)
	config.DB.Create(&models.WorkoutScheduleDetail{WorkoutScheduleID: s.ScheduleID, ExerciseID: ex.ExerciseID})
	id := map[string]string{"id": s.ScheduleID.String()}

	rec := callWith(t, UpdateScheduleStatus, http.MethodPut, `{"status":"COMPLETED"}`, "us@example.com", id)
	wantStatus(t, rec, http.StatusOK)
	var got models.WorkoutSchedule
	decode(t, rec, &got)
	if got.BurnedCalories != 240 {
		t.Errorf("burned = %v, want 240", got.BurnedCalories)
	}
	eventually(t, "first-workout milestone", func() bool {
		return countRows(&models.Milestone{}, "user_id = ? AND milestone_type = ?", u.UserID, "FIRST_WORKOUT") == 1
	})

	rec = callWith(t, UpdateScheduleStatus, http.MethodPut, `{"status":"MISSED"}`, "us@example.com", id)
	decode(t, rec, &got)
	if got.BurnedCalories != 0 || got.Status != "MISSED" {
		t.Errorf("after un-completing: %+v", got)
	}

	// exercises without a burn rate use the 6 kcal/min default
	s2 := models.WorkoutSchedule{UserID: u.UserID, Title: "Bare", ScheduledDate: time.Now(), DurationMinutes: 10, Status: "PENDING"}
	config.DB.Create(&s2)
	decode(t, callWith(t, UpdateScheduleStatus, http.MethodPut, `{"status":"COMPLETED"}`, "us@example.com", map[string]string{"id": s2.ScheduleID.String()}), &got)
	if got.BurnedCalories != 60 {
		t.Errorf("default burn = %v, want 60", got.BurnedCalories)
	}
}

func TestMilestonesAreAwardedOnceAndForEveryRule(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "ms@example.com", "pw", true)
	for i := 0; i < 10; i++ {
		completedWorkout(t, u, time.Now().AddDate(0, 0, -i), 600, 30) // 6000 kcal in total
	}
	config.DB.Create(&models.WeightLog{UserID: u.UserID, Weight: 70, LogDate: time.Now()})

	checkForMilestones(u.UserID)
	checkForMilestones(u.UserID) // idempotent

	rec := call(t, GetMilestones, http.MethodGet, "", "ms@example.com")
	wantStatus(t, rec, http.StatusOK)
	var list []models.Milestone
	decode(t, rec, &list)
	types := map[string]bool{}
	for _, m := range list {
		types[m.MilestoneType] = true
	}
	for _, want := range []string{"FIRST_WORKOUT", "STREAK_3", "WORKOUT_5", "WORKOUT_10", "BURN_1000", "BURN_5000", "WEIGHT_TRACKED"} {
		if !types[want] {
			t.Errorf("missing milestone %s", want)
		}
	}
	if len(list) != 7 {
		t.Errorf("milestones = %d, want 7 (no duplicates)", len(list))
	}

	// the count query failing is tolerated
	config.DB.Exec("DROP TABLE workout_schedules")
	checkForMilestones(u.UserID)
	wantStatus(t, call(t, GetMilestones, http.MethodGet, "", ""), http.StatusNotFound)
	config.DB.Exec("DROP TABLE milestones")
	wantStatus(t, call(t, GetMilestones, http.MethodGet, "", "ms@example.com"), http.StatusInternalServerError)
}

func TestDeleteSchedulesRemoveTheirExercisesAndFailCleanly(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "ds@example.com", "pw", true)
	ex := models.Exercise{Name: "Plank", BurnRate: 4}
	config.DB.Create(&ex)
	mk := func(title string) models.WorkoutSchedule {
		s := models.WorkoutSchedule{UserID: u.UserID, Title: title, ScheduledDate: time.Now(), Status: "PENDING"}
		config.DB.Create(&s)
		config.DB.Create(&models.WorkoutScheduleDetail{WorkoutScheduleID: s.ScheduleID, ExerciseID: ex.ExerciseID})
		return s
	}
	a, _ := mk("A"), mk("B")

	wantStatus(t, callWith(t, DeleteSchedule, http.MethodDelete, "", "ds@example.com", map[string]string{"id": a.ScheduleID.String()}), http.StatusOK)
	if countRows(&models.WorkoutScheduleDetail{}, "workout_schedule_id = ?", a.ScheduleID) != 0 {
		t.Error("details of the deleted schedule remain")
	}
	if countRows(&models.WorkoutSchedule{}, "user_id = ?", u.UserID) != 1 {
		t.Error("only one schedule should remain")
	}

	wantStatus(t, call(t, DeleteAllSchedules, http.MethodDelete, "", "ds@example.com"), http.StatusOK)
	if countRows(&models.WorkoutSchedule{}, "user_id = ?", u.UserID) != 0 || countRows(&models.WorkoutScheduleDetail{}, "1 = 1") != 0 {
		t.Error("delete-all left rows behind")
	}

	s := mk("C")
	config.DB.Exec(`CREATE TRIGGER no_delete BEFORE DELETE ON workout_schedules BEGIN SELECT RAISE(ABORT, 'keep'); END`)
	wantStatus(t, callWith(t, DeleteSchedule, http.MethodDelete, "", "ds@example.com", map[string]string{"id": s.ScheduleID.String()}), http.StatusInternalServerError)
}
