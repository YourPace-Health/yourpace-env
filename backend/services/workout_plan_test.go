package services

import (
	"math"
	"testing"

	"youpace/models"
)

func ex(name, muscle, equip string, burn float64) models.Exercise {
	return models.Exercise{Name: name, MuscleGroup: muscle, EquipmentNeeded: equip, BurnRate: burn}
}

func names(list []models.Exercise) []string {
	out := make([]string, len(list))
	for i, e := range list {
		out[i] = e.Name
	}
	return out
}

func has(list []models.Exercise, name string) bool {
	for _, e := range list {
		if e.Name == name {
			return true
		}
	}
	return false
}

var sample = []models.Exercise{
	ex("Push-ups", "Chest", "Bodyweight", 7),
	ex("Air Squat", "Legs", "Bodyweight", 6),
	ex("Burpee", "Full Body", "Bodyweight", 10),
	ex("Dumbbell Curl", "Arms", "Dumbbells", 4),
	ex("Pull-up", "Back", "Pull-up Bar", 8),
	ex("Shoulder Press", "Shoulders", "Dumbbells", 5),
}

func TestFilterDefaultsToBodyweight(t *testing.T) {
	got := FilterSuggestedExercises(sample, "", "")
	for _, n := range []string{"Push-ups", "Air Squat", "Burpee"} {
		if !has(got, n) {
			t.Errorf("missing %s in %v", n, names(got))
		}
	}
	if has(got, "Dumbbell Curl") || has(got, "Pull-up") {
		t.Errorf("equipment not owned was suggested: %v", names(got))
	}
}

func TestFilterUsesOwnedEquipment(t *testing.T) {
	got := FilterSuggestedExercises(sample, " Dumbbells , Pull-up Bar", "")
	if !has(got, "Dumbbell Curl") || !has(got, "Pull-up") || !has(got, "Shoulder Press") {
		t.Errorf("got %v", names(got))
	}
	if has(got, "Push-ups") {
		t.Errorf("bodyweight exercise suggested without bodyweight equipment: %v", names(got))
	}
}

func TestFilterRespectsLimitations(t *testing.T) {
	cases := []struct {
		limit  string
		equip  string
		banned []string
	}{
		{"Knee pain", "bodyweight", []string{"Air Squat", "Burpee"}},
		{"ปวดเข่า", "bodyweight", []string{"Air Squat", "Burpee"}},
		{"lower back", "bodyweight, pull-up bar", []string{"Pull-up"}},
		{"shoulder injury", "dumbbells", []string{"Shoulder Press"}},
		{"ankle", "bodyweight", []string{"Burpee"}},
	}
	for _, tc := range cases {
		got := FilterSuggestedExercises(sample, tc.equip, tc.limit)
		for _, b := range tc.banned {
			if has(got, b) {
				t.Errorf("limit %q: %s should be excluded, got %v", tc.limit, b, names(got))
			}
		}
	}
}

func TestFilterFallsBackToAllWhenNothingMatches(t *testing.T) {
	got := FilterSuggestedExercises(sample, "rowing machine", "")
	if len(got) != len(sample) {
		t.Errorf("want all %d exercises as fallback, got %v", len(sample), names(got))
	}
}

func TestGoalPlan(t *testing.T) {
	cases := map[string][2]string{
		"LOSE_WEIGHT":       {"Fat Burn & Cardio Session", "MODERATE"},
		"GAIN_MUSCLE":       {"Strength & Muscle Building", "INTENSE"},
		"IMPROVE_ENDURANCE": {"Stamina & Cardio Endurance", "MODERATE"},
		"MAINTAIN_HEALTH":   {"Active Health Recovery", "LIGHT"},
		"":                  {"General Fitness Routine", "MODERATE"},
		"UNKNOWN":           {"General Fitness Routine", "MODERATE"},
	}
	for goal, want := range cases {
		title, intensity := GoalPlan(goal)
		if title != want[0] || intensity != want[1] {
			t.Errorf("GoalPlan(%q) = %q, %q; want %q, %q", goal, title, intensity, want[0], want[1])
		}
	}
}

func TestPickExercises(t *testing.T) {
	if got := PickExercises(nil, 3, func(int) int { return 0 }); got != nil {
		t.Errorf("empty input should give nil, got %v", got)
	}

	i := 0
	got := PickExercises(sample, 3, func(n int) int {
		if n != len(sample) {
			t.Errorf("pick called with %d, want %d", n, len(sample))
		}
		i++
		return i - 1
	})
	if len(got) != 3 || got[0].Name != "Push-ups" || got[2].Name != "Burpee" {
		t.Errorf("got %v", names(got))
	}
}

func TestEstimatePlanCalories(t *testing.T) {
	if got := EstimatePlanCalories(nil, 30); got != 180 {
		t.Errorf("no exercises = %v, want 180 (default 6.0/min)", got)
	}
	selected := []models.Exercise{{BurnRate: 4}, {BurnRate: 8}, {BurnRate: 0}}
	// average over all 3 selected exercises: (4+8)/3 = 4 kcal/min
	if got := EstimatePlanCalories(selected, 30); math.Abs(got-120) > 1e-9 {
		t.Errorf("got %v, want 120", got)
	}
	if got := EstimatePlanCalories([]models.Exercise{{BurnRate: 0}}, 10); got != 60 {
		t.Errorf("zero burn rates should use default, got %v", got)
	}
}
