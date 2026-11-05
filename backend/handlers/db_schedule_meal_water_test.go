package handlers

import (
	"net/http"
	"testing"

	"youpace/config"
	"youpace/models"
)

// ---- water ----

func TestWaterLogLifecycle(t *testing.T) {
	setupTestDB(t)
	createUser(t, "water@example.com", "x", true)

	var log WaterLogResponse
	rec := call(t, GetTodayWaterLog, http.MethodGet, "", "water@example.com")
	wantStatus(t, rec, http.StatusOK)
	decode(t, rec, &log)
	if log.Glasses != 0 || log.TargetGlasses <= 0 {
		t.Fatalf("a fresh day should start at 0 glasses with a target, got %+v", log)
	}

	rec = call(t, UpdateTodayWaterLog, http.MethodPut, `{"glasses":4}`, "water@example.com")
	wantStatus(t, rec, http.StatusOK)
	decode(t, rec, &log)
	if log.Glasses != 4 || log.AmountMl != 1000 {
		t.Errorf("4 glasses = 1000 ml, got %+v", log)
	}

	rec = call(t, UpdateTodayWaterLog, http.MethodPut, `{"amountMl":600}`, "water@example.com")
	decode(t, rec, &log)
	if log.AmountMl != 600 || log.Glasses != 2 {
		t.Errorf("600 ml = 2 glasses, got %+v", log)
	}

	rec = call(t, UpdateTodayWaterLog, http.MethodPut, `{"glasses":-3}`, "water@example.com")
	decode(t, rec, &log)
	if log.Glasses != 0 || log.AmountMl != 0 {
		t.Errorf("negative values clamp to zero, got %+v", log)
	}

	var rows int64
	config.DB.Model(&models.WaterLog{}).Count(&rows)
	if rows != 1 {
		t.Errorf("all updates in a day must reuse one row, got %d", rows)
	}
}

func TestWaterPercentageCapsAtHundred(t *testing.T) {
	setupTestDB(t)
	createUser(t, "cap@example.com", "x", true)
	var log WaterLogResponse
	decode(t, call(t, UpdateTodayWaterLog, http.MethodPut, `{"glasses":99}`, "cap@example.com"), &log)
	if log.Percentage != 100 {
		t.Errorf("percentage = %v, want 100", log.Percentage)
	}
}

// ---- milestones ----

func TestMilestonesEmptyForNewUser(t *testing.T) {
	setupTestDB(t)
	createUser(t, "m@example.com", "x", true)
	var list []models.Milestone
	rec := call(t, GetMilestones, http.MethodGet, "", "m@example.com")
	wantStatus(t, rec, http.StatusOK)
	decode(t, rec, &list)
	if len(list) != 0 {
		t.Errorf("want no milestones, got %+v", list)
	}
}

// ---- schedules ----

func logBurn(t *testing.T, email, body string) models.WorkoutSchedule {
	t.Helper()
	rec := call(t, LogCustomBurnWorkout, http.MethodPost, body, email)
	wantStatus(t, rec, http.StatusCreated)
	var s models.WorkoutSchedule
	decode(t, rec, &s)
	return s
}

func TestLogCustomBurnCreatesCompletedWorkoutWithExercises(t *testing.T) {
	setupTestDB(t)
	createUser(t, "b@example.com", "x", true)

	s := logBurn(t, "b@example.com",
		`{"title":"Morning run","durationMinutes":40,"burnedCalories":300,"targetIntensity":"intense","scheduledDate":"2026-11-02","scheduledTime":"07:15","description":"• Jog - warm up\n• Sprint - intervals\n• ประโยชน์: heart"}`)

	if s.Status != "COMPLETED" || s.Title != "Morning run" || s.DurationMinutes != 40 || s.BurnedCalories != 300 || s.TargetIntensity != "INTENSE" {
		t.Errorf("unexpected schedule: %+v", s)
	}

	var details int64
	config.DB.Model(&models.WorkoutScheduleDetail{}).Where("workout_schedule_id = ?", s.ScheduleID).Count(&details)
	if details != 2 {
		t.Errorf("benefit lines must be skipped: want 2 exercise details, got %d", details)
	}
}

func TestLogCustomBurnDefaults(t *testing.T) {
	setupTestDB(t)
	createUser(t, "d@example.com", "x", true)
	s := logBurn(t, "d@example.com", `{}`)
	if s.DurationMinutes != 30 || s.BurnedCalories != 180 || s.TargetIntensity != "MODERATE" || s.Title == "" {
		t.Errorf("defaults = 30 min, 6 kcal/min, MODERATE, got %+v", s)
	}
}

func TestUpdateScheduleStatus(t *testing.T) {
	setupTestDB(t)
	owner := createUser(t, "o@example.com", "x", true)
	createUser(t, "other@example.com", "x", true)
	w := addWorkout(t, owner, "Plan", "PENDING", todayUTC())

	id := map[string]string{"id": w.ScheduleID.String()}

	// completing computes calories from the duration (30 min at the 6 kcal/min fallback)
	rec := callWith(t, UpdateScheduleStatus, http.MethodPut, `{"status":"COMPLETED"}`, "o@example.com", id)
	wantStatus(t, rec, http.StatusOK)
	var got models.WorkoutSchedule
	decode(t, rec, &got)
	if got.Status != "COMPLETED" || got.BurnedCalories != 180 {
		t.Errorf("completed = %+v", got)
	}

	// any other status resets the burned calories
	rec = callWith(t, UpdateScheduleStatus, http.MethodPut, `{"status":"MISSED"}`, "o@example.com", id)
	decode(t, rec, &got)
	if got.Status != "MISSED" || got.BurnedCalories != 0 {
		t.Errorf("missed = %+v", got)
	}

	wantStatus(t, callWith(t, UpdateScheduleStatus, http.MethodPut, `{"status":"COMPLETED"}`, "other@example.com", id), http.StatusNotFound)
	wantStatus(t, callWith(t, UpdateScheduleStatus, http.MethodPut, `{"status":"COMPLETED"}`, "o@example.com", map[string]string{"id": "nope"}), http.StatusBadRequest)
}

func TestSchedulesArePerUser(t *testing.T) {
	setupTestDB(t)
	a := createUser(t, "a@example.com", "x", true)
	createUser(t, "b@example.com", "x", true)
	addWorkout(t, a, "A workout", "PENDING", todayUTC())

	var mine, theirs []models.WorkoutSchedule
	decode(t, call(t, GetSchedules, http.MethodGet, "", "a@example.com"), &mine)
	decode(t, call(t, GetSchedules, http.MethodGet, "", "b@example.com"), &theirs)
	if len(mine) != 1 || len(theirs) != 0 {
		t.Errorf("mine=%d theirs=%d, want 1 and 0", len(mine), len(theirs))
	}
}

func TestDeleteScheduleOnlyTouchesTheOwnersData(t *testing.T) {
	setupTestDB(t)
	owner := createUser(t, "owner@example.com", "x", true)
	createUser(t, "intruder@example.com", "x", true)

	w := addWorkout(t, owner, "Owner plan", "PENDING", todayUTC())
	ex := models.Exercise{Name: "Plank", MuscleGroup: "Core", EquipmentNeeded: "Bodyweight"}
	config.DB.Create(&ex)
	config.DB.Create(&models.WorkoutScheduleDetail{WorkoutScheduleID: w.ScheduleID, ExerciseID: ex.ExerciseID, Sets: 3, Reps: 10})

	id := map[string]string{"id": w.ScheduleID.String()}

	// someone else deleting the owner's schedule must change nothing, not even its details
	callWith(t, DeleteSchedule, http.MethodDelete, "", "intruder@example.com", id)
	var schedules, details int64
	config.DB.Model(&models.WorkoutSchedule{}).Count(&schedules)
	config.DB.Model(&models.WorkoutScheduleDetail{}).Count(&details)
	if schedules != 1 || details != 1 {
		t.Fatalf("intruder changed data: schedules=%d details=%d, want 1 and 1", schedules, details)
	}

	// the owner can delete it, details included
	wantStatus(t, callWith(t, DeleteSchedule, http.MethodDelete, "", "owner@example.com", id), http.StatusOK)
	config.DB.Model(&models.WorkoutSchedule{}).Count(&schedules)
	config.DB.Model(&models.WorkoutScheduleDetail{}).Count(&details)
	if schedules != 0 || details != 0 {
		t.Errorf("owner delete left schedules=%d details=%d", schedules, details)
	}

	wantStatus(t, callWith(t, DeleteSchedule, http.MethodDelete, "", "owner@example.com", map[string]string{"id": "x"}), http.StatusBadRequest)
}

func TestDeleteAllSchedulesOnlyDeletesMine(t *testing.T) {
	setupTestDB(t)
	a := createUser(t, "a@example.com", "x", true)
	b := createUser(t, "b@example.com", "x", true)
	addWorkout(t, a, "A1", "PENDING", todayUTC())
	addWorkout(t, a, "A2", "PENDING", todayUTC())
	addWorkout(t, b, "B1", "PENDING", todayUTC())

	wantStatus(t, call(t, DeleteAllSchedules, http.MethodDelete, "", "a@example.com"), http.StatusOK)

	var left []models.WorkoutSchedule
	config.DB.Find(&left)
	if len(left) != 1 || left[0].Title != "B1" {
		t.Errorf("only B's workout should remain, got %+v", left)
	}
}

// ---- meals ----

func TestMealLifecycle(t *testing.T) {
	setupTestDB(t)
	createUser(t, "meal@example.com", "x", true)
	createUser(t, "thief@example.com", "x", true)

	wantStatus(t, call(t, LogMeal, http.MethodPost, `{"mealType":"LUNCH"}`, "meal@example.com"), http.StatusBadRequest)

	rec := call(t, LogMeal, http.MethodPost, `{"mealType":"DINNER","mealDescription":"soup","calories":300,"protein":20,"carbs":30,"fat":8}`, "meal@example.com")
	wantStatus(t, rec, http.StatusCreated)
	var meal models.MealLog
	decode(t, rec, &meal)
	if meal.Calories != 300 || meal.MealType != "DINNER" {
		t.Fatalf("meal = %+v", meal)
	}
	wantStatus(t, call(t, LogMeal, http.MethodPost, `{"mealDescription":"snack","calories":150.5}`, "meal@example.com"), http.StatusCreated)

	var summary TodayNutritionSummary
	rec = call(t, GetTodayMealsSummary, http.MethodGet, "", "meal@example.com")
	wantStatus(t, rec, http.StatusOK)
	decode(t, rec, &summary)
	if summary.TotalCalories != 450.5 || len(summary.Meals) != 2 {
		t.Errorf("summary = %+v", summary)
	}

	// another user cannot delete it, the owner can
	id := map[string]string{"id": meal.MealID.String()}
	callWith(t, DeleteMeal, http.MethodDelete, "", "thief@example.com", id)
	var n int64
	config.DB.Model(&models.MealLog{}).Count(&n)
	if n != 2 {
		t.Fatalf("meal removed by another user, rows=%d", n)
	}
	wantStatus(t, callWith(t, DeleteMeal, http.MethodDelete, "", "meal@example.com", id), http.StatusOK)
	config.DB.Model(&models.MealLog{}).Count(&n)
	if n != 1 {
		t.Errorf("rows after owner delete = %d, want 1", n)
	}

	wantStatus(t, callWith(t, DeleteMeal, http.MethodDelete, "", "meal@example.com", map[string]string{"id": "x"}), http.StatusBadRequest)
}

func TestMealHistoryIsPerUserAndNewestFirst(t *testing.T) {
	setupTestDB(t)
	createUser(t, "h@example.com", "x", true)
	createUser(t, "g@example.com", "x", true)
	call(t, LogMeal, http.MethodPost, `{"mealDescription":"first","calories":100}`, "h@example.com")
	call(t, LogMeal, http.MethodPost, `{"mealDescription":"second","calories":200}`, "h@example.com")

	var mine, theirs []models.MealLog
	decode(t, call(t, GetMealHistory, http.MethodGet, "", "h@example.com"), &mine)
	decode(t, call(t, GetMealHistory, http.MethodGet, "", "g@example.com"), &theirs)
	if len(mine) != 2 || len(theirs) != 0 || mine[0].MealDescription != "second" {
		t.Errorf("mine=%+v theirs=%+v", mine, theirs)
	}
}
