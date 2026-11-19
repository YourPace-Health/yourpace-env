package handlers

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"youpace/config"
	"youpace/models"
)

const mealJSON = `{"output":"{\"calories\":520,\"protein\":30,\"carbs\":60,\"fat\":15,\"healthScore\":88,\"summary\":\"balanced\",\"tips\":\"add veg\"}"}`

func TestAnalyzeMealPreview(t *testing.T) {
	setupTestDB(t)
	createUser(t, "mp@example.com", "pw", true)
	fakeAI(t, mealJSON)

	wantStatus(t, call(t, AnalyzeMealPreview, http.MethodPost, `{"mealDescription":"rice"}`, ""), http.StatusNotFound)
	wantStatus(t, call(t, AnalyzeMealPreview, http.MethodPost, `{bad`, "mp@example.com"), http.StatusBadRequest)
	wantStatus(t, call(t, AnalyzeMealPreview, http.MethodPost, `{"mealDescription":""}`, "mp@example.com"), http.StatusBadRequest)

	rec := call(t, AnalyzeMealPreview, http.MethodPost, `{"mealDescription":"rice"}`, "mp@example.com")
	wantStatus(t, rec, http.StatusOK)
	var got struct {
		Calories    float64
		HealthScore int
	}
	decode(t, rec, &got)
	if got.Calories != 520 || got.HealthScore != 88 {
		t.Errorf("analysis = %+v", got)
	}

	aiDown(t)
	wantStatus(t, call(t, AnalyzeMealPreview, http.MethodPost, `{"mealDescription":"rice"}`, "mp@example.com"), http.StatusInternalServerError)
}

func TestLogMealWithoutCaloriesAsksTheAI(t *testing.T) {
	setupTestDB(t)
	createUser(t, "lm@example.com", "pw", true)
	fakeAI(t, mealJSON)

	rec := call(t, LogMeal, http.MethodPost, `{"mealDescription":"pad thai","mealType":"DINNER"}`, "lm@example.com")
	wantStatus(t, rec, http.StatusCreated)
	var m models.MealLog
	decode(t, rec, &m)
	if m.Calories != 520 || m.HealthScore != 88 || m.MealType != "DINNER" || !strings.Contains(m.AISummary, "add veg") {
		t.Errorf("meal = %+v", m)
	}

	// AI unavailable: the meal is still stored, just without nutrition numbers
	aiDown(t)
	rec = call(t, LogMeal, http.MethodPost, `{"mealDescription":"mystery"}`, "lm@example.com")
	wantStatus(t, rec, http.StatusCreated)
	decode(t, rec, &m)
	if m.Calories != 0 || m.AISummary != "บันทึกมื้ออาหารทั่วไป" || m.MealType != "LUNCH" {
		t.Errorf("fallback meal = %+v", m)
	}
}

func TestLogMealValidationAndFailures(t *testing.T) {
	setupTestDB(t)
	createUser(t, "lv@example.com", "pw", true)
	wantStatus(t, call(t, LogMeal, http.MethodPost, `{"mealDescription":"x"}`, ""), http.StatusNotFound)
	wantStatus(t, call(t, LogMeal, http.MethodPost, `{bad`, "lv@example.com"), http.StatusBadRequest)
	wantStatus(t, call(t, LogMeal, http.MethodPost, `{}`, "lv@example.com"), http.StatusBadRequest)

	rec := call(t, LogMeal, http.MethodPost, `{"mealDescription":"x","calories":100,"protein":5,"carbs":10,"fat":2}`, "lv@example.com")
	wantStatus(t, rec, http.StatusCreated)
	var m models.MealLog
	decode(t, rec, &m)
	if m.Protein != 5 || m.Carbs != 10 || m.Fat != 2 {
		t.Errorf("macros not stored: %+v", m)
	}

	config.DB.Exec("DROP TABLE meal_logs")
	wantStatus(t, call(t, LogMeal, http.MethodPost, `{"mealDescription":"x","calories":100}`, "lv@example.com"), http.StatusInternalServerError)
	wantStatus(t, call(t, GetMealHistory, http.MethodGet, "", "lv@example.com"), http.StatusInternalServerError)
	wantStatus(t, call(t, GetTodayMealsSummary, http.MethodGet, "", "lv@example.com"), http.StatusInternalServerError)
	wantStatus(t, callWith(t, DeleteMeal, http.MethodDelete, "", "lv@example.com", map[string]string{"id": "11111111-1111-1111-1111-111111111111"}), http.StatusInternalServerError)
}

func TestMealEndpointsRequireAKnownUser(t *testing.T) {
	setupTestDB(t)
	for name, h := range map[string]func() int{
		"today":    func() int { return call(t, GetTodayMealsSummary, http.MethodGet, "", "").Code },
		"history":  func() int { return call(t, GetMealHistory, http.MethodGet, "", "").Code },
		"delete":   func() int { return callWith(t, DeleteMeal, http.MethodDelete, "", "", map[string]string{"id": "x"}).Code },
		"energy":   func() int { return call(t, GetEnergyBalanceSummary, http.MethodGet, "", "").Code },
		"weekly":   func() int { return call(t, GetWeeklyNutritionAnalytics, http.MethodGet, "", "").Code },
		"coach":    func() int { return call(t, GetDailyNutritionCoachFeedback, http.MethodGet, "", "").Code },
		"photo":    func() int { return call(t, AnalyzeMealPhotoPreview, http.MethodPost, `{}`, "").Code },
		"today-nu": func() int { return call(t, GetTodayMealsSummary, http.MethodGet, "", "ghost@example.com").Code },
		"energy-nu": func() int {
			return call(t, GetEnergyBalanceSummary, http.MethodGet, "", "ghost@example.com").Code
		},
		"weekly-nu": func() int {
			return call(t, GetWeeklyNutritionAnalytics, http.MethodGet, "", "ghost@example.com").Code
		},
		"coach-nu": func() int {
			return call(t, GetDailyNutritionCoachFeedback, http.MethodGet, "", "ghost@example.com").Code
		},
	} {
		if code := h(); code != http.StatusNotFound {
			t.Errorf("%s: status = %d, want 404", name, code)
		}
	}
}

func visionAPI(t *testing.T, text string) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"candidates":[{"content":{"parts":[{"text":"` + strings.ReplaceAll(text, `"`, `\"`) + `"}]}}]}`))
	}))
	t.Cleanup(srv.Close)
	t.Setenv("GEMINI_API_KEY", "k")
	t.Setenv("GEMINI_URL", srv.URL)
}

func TestAnalyzeMealPhotoPreview(t *testing.T) {
	setupTestDB(t)
	createUser(t, "ph@example.com", "pw", true)
	visionAPI(t, `{"mealName":"Salad","calories":250,"protein":8,"carbs":20,"fat":12,"healthScore":92,"summary":"fresh","tips":"ok"}`)

	img := base64.StdEncoding.EncodeToString([]byte("fake image bytes"))
	wantStatus(t, call(t, AnalyzeMealPhotoPreview, http.MethodPost, `{bad`, "ph@example.com"), http.StatusBadRequest)
	wantStatus(t, call(t, AnalyzeMealPhotoPreview, http.MethodPost, `{}`, "ph@example.com"), http.StatusBadRequest)
	wantStatus(t, call(t, AnalyzeMealPhotoPreview, http.MethodPost, `{"imageData":"abc","mimeType":"image/gif"}`, "ph@example.com"), http.StatusBadRequest)

	rec := call(t, AnalyzeMealPhotoPreview, http.MethodPost, `{"imageData":"data:image/png;base64,`+img+`"}`, "ph@example.com")
	wantStatus(t, rec, http.StatusOK)
	if !strings.Contains(rec.Body.String(), "Salad") {
		t.Errorf("body = %s", rec.Body.String())
	}
}

func TestEnergyBalanceStatusMessages(t *testing.T) {
	setupTestDB(t)
	cases := []struct {
		goal     string
		eaten    float64
		burned   float64
		contains string
	}{
		{"LOSE_WEIGHT", 100, 400, "Calorie Deficit ที่ยอดเยี่ยม"},
		{"LOSE_WEIGHT", 100, 0, ""}, // deficit is positive but may be moderate or large depending on TDEE
		{"LOSE_WEIGHT", 90000, 0, "เกินเกณฑ์"},
		{"GAIN_MUSCLE", 90000, 0, "เพียงพอ"},
		{"GAIN_MUSCLE", 0, 0, "ต่ำกว่าเป้าหมาย"},
		{"MAINTAIN_HEALTH", 1000, 0, "สมดุลพลังงาน"},
	}
	for i, tc := range cases {
		email := "eb" + string(rune('a'+i)) + "@example.com"
		u := createUser(t, email, "pw", true)
		config.DB.Model(&u).Updates(map[string]interface{}{"fitness_goal": tc.goal, "weight": 70, "height": 170, "age": 30, "gender": "MALE"})
		if tc.eaten > 0 {
			config.DB.Create(&models.MealLog{UserID: u.UserID, LogDate: time.Now(), MealDescription: "m", Calories: tc.eaten})
		}
		if tc.burned > 0 {
			completedWorkout(t, u, time.Now(), tc.burned, 30)
		}
		// a completed workout with no recorded burn counts as the 250 kcal default
		if i == 1 {
			completedWorkout(t, u, time.Now(), 0, 30)
		}
		rec := call(t, GetEnergyBalanceSummary, http.MethodGet, "", email)
		wantStatus(t, rec, http.StatusOK)
		var res EnergyBalanceSummary
		decode(t, rec, &res)
		if res.StatusMessage == "" || !strings.Contains(res.StatusMessage, tc.contains) {
			t.Errorf("case %d (%s): status %q lacks %q (%+v)", i, tc.goal, res.StatusMessage, tc.contains, res)
		}
		if i == 1 && res.CaloriesBurned != 250 {
			t.Errorf("default burn = %v, want 250", res.CaloriesBurned)
		}
	}
}

func TestWeeklyNutritionAnalytics(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "wk@example.com", "pw", true)
	config.DB.Model(&u).Updates(map[string]interface{}{"weight": 70, "height": 170, "age": 30, "gender": "MALE"})

	// empty week: default macro split
	rec := call(t, GetWeeklyNutritionAnalytics, http.MethodGet, "", "wk@example.com")
	wantStatus(t, rec, http.StatusOK)
	var res WeeklyNutritionAnalytics
	decode(t, rec, &res)
	if len(res.DailyPoints) != 7 || res.MacroDistribution.ProteinPct != 30 || res.MacroDistribution.CarbsPct != 45 {
		t.Errorf("empty week = %+v", res)
	}

	today := time.Now()
	config.DB.Create(&models.MealLog{UserID: u.UserID, LogDate: today, MealDescription: "a", Calories: 700, Protein: 40, Carbs: 80, Fat: 20})
	config.DB.Create(&models.MealLog{UserID: u.UserID, LogDate: today.AddDate(0, 0, -2), MealDescription: "b", Calories: 500, Protein: 20, Carbs: 60, Fat: 10})
	completedWorkout(t, u, today, 0, 30) // default 250 burn
	completedWorkout(t, u, today.AddDate(0, 0, -1), 300, 30)

	rec = call(t, GetWeeklyNutritionAnalytics, http.MethodGet, "", "wk@example.com")
	decode(t, rec, &res)
	last := res.DailyPoints[6]
	if last.CaloriesIn != 700 || last.CaloriesBurned != 250 || last.NetCalories != 450 {
		t.Errorf("today point = %+v", last)
	}
	if res.AvgDailyCalories != 171.4 {
		t.Errorf("avg calories = %v, want 171.4", res.AvgDailyCalories)
	}
	sum := res.MacroDistribution.ProteinPct + res.MacroDistribution.CarbsPct + res.MacroDistribution.FatPct
	if sum < 99.7 || sum > 100.3 {
		t.Errorf("macro split sums to %v", sum)
	}
	if res.ProjectedWeightLossKg <= 0 || res.WeeklyDeficitTotal <= 0 {
		t.Errorf("expected a deficit against TDEE: %+v", res)
	}
}

func TestDailyCoachFeedback(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "co@example.com", "pw", true)
	fakeAI(t, `{"output":"{\"dietScore\":7,\"title\":\"Solid\",\"highlights\":[\"protein\"],\"suggestions\":[\"veg\"],\"coachNote\":\"nice\"}"}`)

	// no meals yet
	rec := call(t, GetDailyNutritionCoachFeedback, http.MethodGet, "", "co@example.com")
	wantStatus(t, rec, http.StatusOK)
	if !strings.Contains(rec.Body.String(), "Solid") {
		t.Errorf("body = %s", rec.Body.String())
	}

	config.DB.Create(&models.MealLog{UserID: u.UserID, LogDate: time.Now(), MealType: "LUNCH", MealDescription: "curry", Calories: 600})
	completedWorkout(t, u, time.Now(), 0, 20)
	completedWorkout(t, u, time.Now(), 120, 20)
	wantStatus(t, call(t, GetDailyNutritionCoachFeedback, http.MethodGet, "", "co@example.com"), http.StatusOK)

	// AI down: the service supplies a generic message instead of failing
	aiDown(t)
	rec = call(t, GetDailyNutritionCoachFeedback, http.MethodGet, "", "co@example.com")
	wantStatus(t, rec, http.StatusOK)
	if !strings.Contains(rec.Body.String(), "ภาพรวมโภชนาการอยู่ในเกณฑ์ดี") {
		t.Errorf("body = %s", rec.Body.String())
	}
}
