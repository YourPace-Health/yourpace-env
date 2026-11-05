package services

import (
	"strings"

	"youpace/models"
)

// splitLowerCSV splits a comma-separated profile field into trimmed lowercase items.
func splitLowerCSV(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(strings.ToLower(s), ",")
	for i, p := range parts {
		parts[i] = strings.TrimSpace(p)
	}
	return parts
}

func containsAny(s string, subs ...string) bool {
	for _, sub := range subs {
		if strings.Contains(s, sub) {
			return true
		}
	}
	return false
}

// isSafeForLimitations reports whether an exercise avoids the muscle groups and
// movements that the user's physical limitations (knee, back, shoulder, ankle,
// in English or Thai) put under strain.
func isSafeForLimitations(ex models.Exercise, limits []string) bool {
	muscle := strings.ToLower(ex.MuscleGroup)
	name := strings.ToLower(ex.Name)
	for _, limit := range limits {
		switch {
		case containsAny(limit, "knee", "เข่า") &&
			(muscle == "legs" || containsAny(name, "squat", "lunge", "burpee")):
			return false
		case containsAny(limit, "back", "หลัง") && muscle == "back":
			return false
		case containsAny(limit, "shoulder", "ไหล่") && (muscle == "shoulders" || strings.Contains(name, "shoulder")):
			return false
		case containsAny(limit, "ankle", "ข้อเท้า") && containsAny(name, "burpee", "lunge"):
			return false
		}
	}
	return true
}

// FilterSuggestedExercises keeps the exercises that match the user's equipment
// (default: bodyweight) and are safe for their limitations. When nothing
// survives, all exercises are returned as a safety net.
func FilterSuggestedExercises(exercises []models.Exercise, equipmentOwned, limitations string) []models.Exercise {
	equips := splitLowerCSV(equipmentOwned)
	if len(equips) == 0 {
		equips = []string{"bodyweight"}
	}
	limits := splitLowerCSV(limitations)

	var suggested []models.Exercise
	for _, ex := range exercises {
		needed := strings.ToLower(ex.EquipmentNeeded)
		hasEquipment := false
		for _, eq := range equips {
			if strings.Contains(needed, eq) || (eq == "bodyweight" && needed == "bodyweight") {
				hasEquipment = true
				break
			}
		}
		if hasEquipment && isSafeForLimitations(ex, limits) {
			suggested = append(suggested, ex)
		}
	}
	if len(suggested) == 0 {
		return exercises
	}
	return suggested
}

// GoalPlan returns the workout title and target intensity for a fitness goal.
func GoalPlan(goal string) (title, intensity string) {
	switch goal {
	case "LOSE_WEIGHT":
		return "Fat Burn & Cardio Session", "MODERATE"
	case "GAIN_MUSCLE":
		return "Strength & Muscle Building", "INTENSE"
	case "IMPROVE_ENDURANCE":
		return "Stamina & Cardio Endurance", "MODERATE"
	case "MAINTAIN_HEALTH":
		return "Active Health Recovery", "LIGHT"
	}
	return "General Fitness Routine", "MODERATE"
}

// PickExercises draws n exercises (with repeats) using pick(len) as the index source.
func PickExercises(suggested []models.Exercise, n int, pick func(int) int) []models.Exercise {
	if len(suggested) == 0 {
		return nil
	}
	selected := make([]models.Exercise, 0, n)
	for i := 0; i < n; i++ {
		selected = append(selected, suggested[pick(len(suggested))])
	}
	return selected
}

// EstimatePlanCalories estimates calories for a workout of the given length from
// the average burn rate (kcal/min) of the selected exercises, defaulting to 6.0.
func EstimatePlanCalories(selected []models.Exercise, minutes int) float64 {
	total := 0.0
	for _, ex := range selected {
		if ex.BurnRate > 0 {
			total += ex.BurnRate
		}
	}
	avg := 6.0
	if len(selected) > 0 && total > 0 {
		avg = total / float64(len(selected))
	}
	return float64(minutes) * avg
}
