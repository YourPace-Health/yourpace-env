package handlers

import (
	"net/http"
	"testing"

	"youpace/config"
	"youpace/models"
)

func seedExercises(t *testing.T) map[string]models.Exercise {
	t.Helper()
	list := []models.Exercise{
		{Name: "Push-ups", MuscleGroup: "Chest", EquipmentNeeded: "Bodyweight", BurnRate: 7},
		{Name: "Dumbbell Curl", MuscleGroup: "Arms", EquipmentNeeded: "Dumbbells", BurnRate: 4},
		{Name: "Barbell Squat", MuscleGroup: "Legs", EquipmentNeeded: "Barbell", BurnRate: 8},
		{Name: "Stretch", MuscleGroup: "Full Body", EquipmentNeeded: "", BurnRate: 2},
	}
	out := map[string]models.Exercise{}
	for _, e := range list {
		e := e
		if err := config.DB.Create(&e).Error; err != nil {
			t.Fatal(err)
		}
		out[e.Name] = e
	}
	return out
}

func names(list []models.Exercise) map[string]bool {
	m := map[string]bool{}
	for _, e := range list {
		m[e.Name] = true
	}
	return m
}

func TestGetAllExercises(t *testing.T) {
	setupTestDB(t)
	seedExercises(t)
	var got []models.Exercise
	rec := call(t, GetAllExercises, http.MethodGet, "", "")
	wantStatus(t, rec, http.StatusOK)
	decode(t, rec, &got)
	if len(got) != 4 {
		t.Errorf("got %d exercises, want 4", len(got))
	}
}

func TestSuggestedExercisesMatchOwnedEquipment(t *testing.T) {
	setupTestDB(t)
	seedExercises(t)
	u := createUser(t, "eq@example.com", "x", true)

	// no equipment recorded: bodyweight and exercises that need nothing
	var got []models.Exercise
	decode(t, call(t, GetSuggestedExercises, http.MethodGet, "", "eq@example.com"), &got)
	if n := names(got); !n["Push-ups"] || !n["Stretch"] || n["Dumbbell Curl"] || n["Barbell Squat"] {
		t.Errorf("default suggestions = %v", n)
	}

	config.DB.Model(&u).Update("equipment_owned", "Dumbbells")
	decode(t, call(t, GetSuggestedExercises, http.MethodGet, "", "eq@example.com"), &got)
	if n := names(got); !n["Dumbbell Curl"] || !n["Push-ups"] || n["Barbell Squat"] {
		t.Errorf("with dumbbells = %v", n)
	}
}

func TestFavouriteExercises(t *testing.T) {
	setupTestDB(t)
	ex := seedExercises(t)
	createUser(t, "fav@example.com", "x", true)
	createUser(t, "other@example.com", "x", true)
	id := map[string]string{"id": ex["Push-ups"].ExerciseID.String()}

	wantStatus(t, callWith(t, AddFavExercise, http.MethodPost, "", "fav@example.com", id), http.StatusCreated)
	// adding the same favourite again is harmless
	wantStatus(t, callWith(t, AddFavExercise, http.MethodPost, "", "fav@example.com", id), http.StatusOK)

	var n int64
	config.DB.Model(&models.FavExercise{}).Count(&n)
	if n != 1 {
		t.Errorf("favourite rows = %d, want 1", n)
	}

	var mine, theirs []models.Exercise
	decode(t, call(t, GetFavExercises, http.MethodGet, "", "fav@example.com"), &mine)
	decode(t, call(t, GetFavExercises, http.MethodGet, "", "other@example.com"), &theirs)
	if len(mine) != 1 || mine[0].Name != "Push-ups" || len(theirs) != 0 {
		t.Errorf("mine=%+v theirs=%+v", mine, theirs)
	}

	// another user cannot remove it; the owner can; a second removal is a 404
	wantStatus(t, callWith(t, RemoveFavExercise, http.MethodDelete, "", "other@example.com", id), http.StatusNotFound)
	wantStatus(t, callWith(t, RemoveFavExercise, http.MethodDelete, "", "fav@example.com", id), http.StatusOK)
	wantStatus(t, callWith(t, RemoveFavExercise, http.MethodDelete, "", "fav@example.com", id), http.StatusNotFound)
}

func TestFavouriteExerciseValidation(t *testing.T) {
	setupTestDB(t)
	createUser(t, "v@example.com", "x", true)
	wantStatus(t, callWith(t, AddFavExercise, http.MethodPost, "", "v@example.com", map[string]string{"id": "nope"}), http.StatusBadRequest)
	wantStatus(t, callWith(t, AddFavExercise, http.MethodPost, "", "v@example.com",
		map[string]string{"id": "11111111-1111-1111-1111-111111111111"}), http.StatusNotFound)
}

func TestEquipmentsSortedByDisplayName(t *testing.T) {
	setupTestDB(t)
	config.DB.Create(&models.Equipment{Name: "b", DisplayName: "Banana"})
	config.DB.Create(&models.Equipment{Name: "a", DisplayName: "Apple"})
	var got []models.Equipment
	rec := call(t, GetAllEquipments, http.MethodGet, "", "")
	wantStatus(t, rec, http.StatusOK)
	decode(t, rec, &got)
	if len(got) != 2 || got[0].DisplayName != "Apple" {
		t.Errorf("equipments = %+v", got)
	}
}

// ---- profile ----

func TestUpdateProfileValidatesRanges(t *testing.T) {
	setupTestDB(t)
	createUser(t, "p@example.com", "x", true)
	for _, body := range []string{`{"age":121}`, `{"age":-1}`, `{"height":301}`, `{"weight":501}`} {
		wantStatus(t, call(t, UpdateUserProfile, http.MethodPut, body, "p@example.com"), http.StatusBadRequest)
	}
}

func TestUpdateProfileComputesTargetsAndLogsWeightChanges(t *testing.T) {
	setupTestDB(t)
	createUser(t, "pr@example.com", "x", true)

	body := `{"age":30,"gender":"MALE","height":175,"weight":80,"fitnessGoal":"LOSE_WEIGHT","activityLevel":"MODERATE",` +
		`"equipmentOwned":["Dumbbells","Bodyweight"],"physicalLimitations":["knee"]}`
	rec := call(t, UpdateUserProfile, http.MethodPut, body, "pr@example.com")
	wantStatus(t, rec, http.StatusOK)

	var profile UserProfileResponse
	decode(t, rec, &profile)
	if profile.Weight != 80 || profile.TargetCalories <= 0 || profile.TargetProtein <= 0 {
		t.Errorf("targets should be computed: %+v", profile)
	}
	if len(profile.EquipmentOwned) != 2 || profile.PhysicalLimitations[0] != "knee" {
		t.Errorf("lists = %v / %v", profile.EquipmentOwned, profile.PhysicalLimitations)
	}
	if profile.HealthSummary.BMI <= 0 {
		t.Errorf("health summary missing: %+v", profile.HealthSummary)
	}

	var logs int64
	config.DB.Model(&models.UserHealthLog{}).Count(&logs)
	if logs != 1 {
		t.Fatalf("a first weight should create one health log, got %d", logs)
	}

	// saving the same weight again must not add another log; a new weight does
	call(t, UpdateUserProfile, http.MethodPut, body, "pr@example.com")
	config.DB.Model(&models.UserHealthLog{}).Count(&logs)
	if logs != 1 {
		t.Errorf("unchanged weight added a log (%d)", logs)
	}
	call(t, UpdateUserProfile, http.MethodPut, `{"age":30,"gender":"MALE","height":175,"weight":78,"fitnessGoal":"LOSE_WEIGHT"}`, "pr@example.com")
	config.DB.Model(&models.UserHealthLog{}).Count(&logs)
	if logs != 2 {
		t.Errorf("changed weight should add a log, got %d", logs)
	}
}

func TestUpdateProfileParsesTargetDateFormats(t *testing.T) {
	setupTestDB(t)
	createUser(t, "td@example.com", "x", true)
	for _, d := range []string{"2026-12-31", "2026-12-31T10:00:00Z", "2026-12-31T10:00:00.000Z"} {
		rec := call(t, UpdateUserProfile, http.MethodPut, `{"weight":70,"targetDate":"`+d+`"}`, "td@example.com")
		wantStatus(t, rec, http.StatusOK)
		var p UserProfileResponse
		decode(t, rec, &p)
		if p.TargetDate == nil || p.TargetDate.Year() != 2026 || p.TargetDate.Month() != 12 {
			t.Errorf("targetDate %q -> %v", d, p.TargetDate)
		}
	}
}

// ---- level thresholds ----
