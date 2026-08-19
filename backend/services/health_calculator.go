package services

import (
	"math"
	"strings"
	"time"
	"youpace/models"
)

type ComputedHealthSummary struct {
	BMI                 float64 `json:"bmi"`
	BMICategory         string  `json:"bmiCategory"`
	BMICategoryTh       string  `json:"bmiCategoryTh"`
	BMR                 float64 `json:"bmr"`
	TDEE                float64 `json:"tdee"`
	RecommendedCalories int     `json:"recommendedCalories"`
	TargetProteinGrams  int     `json:"targetProteinGrams"`
	TargetCarbsGrams    int     `json:"targetCarbsGrams"`
	TargetFatGrams      int     `json:"targetFatGrams"`
	RecommendedWaterMl  int     `json:"recommendedWaterMl"`
	IdealWeightMinKg    float64 `json:"idealWeightMinKg"`
	IdealWeightMaxKg    float64 `json:"idealWeightMaxKg"`
}

// CalculateBMI computes body mass index and returns category in EN and TH
func CalculateBMI(heightCm float64, weightKg float64) (float64, string, string) {
	if heightCm <= 0 || weightKg <= 0 {
		return 0, "UNKNOWN", "ไม่ระบุ"
	}
	heightM := heightCm / 100.0
	bmi := weightKg / (heightM * heightM)
	bmi = math.Round(bmi*100) / 100

	var category string
	var categoryTh string

	switch {
	case bmi < 18.5:
		category = "UNDERWEIGHT"
		categoryTh = "น้ำหนักน้อยกว่าเกณฑ์"
	case bmi >= 18.5 && bmi < 23.0:
		category = "NORMAL"
		categoryTh = "น้ำหนักปกติ สมส่วน"
	case bmi >= 23.0 && bmi < 25.0:
		category = "OVERWEIGHT"
		categoryTh = "น้ำหนักเกิน (ท่วม)"
	case bmi >= 25.0 && bmi < 30.0:
		category = "OBESE_STAGE_1"
		categoryTh = "อ้วนระดับ 1"
	default:
		category = "OBESE_STAGE_2"
		categoryTh = "อ้วนระดับ 2 (อ้วนมาก)"
	}

	return bmi, category, categoryTh
}

// CalculateAdjustedWeight computes adjusted body weight for overweight users to prevent BMR overestimation
func CalculateAdjustedWeight(heightCm float64, weightKg float64) float64 {
	if heightCm <= 0 || weightKg <= 0 {
		return weightKg
	}
	heightM := heightCm / 100.0
	idealWeight := 22.0 * heightM * heightM // Ideal BMI 22.0

	// If overweight (> 120% of ideal), use Adjusted Body Weight (ABW = IBW + 0.4 * (Actual - IBW))
	if weightKg > (idealWeight * 1.2) {
		return idealWeight + 0.4*(weightKg-idealWeight)
	}
	return weightKg
}

// CalculateBMR computes Basal Metabolic Rate using Mifflin-St Jeor Equation with Adjusted Weight for accuracy
func CalculateBMR(gender string, weightKg float64, heightCm float64, age int) float64 {
	if weightKg <= 0 || heightCm <= 0 || age <= 0 {
		return 0
	}

	effectiveWeight := CalculateAdjustedWeight(heightCm, weightKg)

	// Mifflin-St Jeor Formula:
	// BMR = 10W + 6.25H - 5A + s (s = +5 for male, -161 for female)
	s := 5.0
	g := strings.ToUpper(strings.TrimSpace(gender))
	if g == "FEMALE" || g == "F" || g == "หญิง" {
		s = -161.0
	}

	bmr := (10.0 * effectiveWeight) + (6.25 * heightCm) - (5.0 * float64(age)) + s
	if bmr < 0 {
		bmr = 0
	}
	return math.Round(bmr)
}

// CalculateTDEE computes Total Daily Energy Expenditure based on activity multiplier
func CalculateTDEE(bmr float64, activityLevel string) float64 {
	if bmr <= 0 {
		return 0
	}

	multiplier := 1.2 // Default Sedentary
	act := strings.ToUpper(strings.TrimSpace(activityLevel))

	switch act {
	case "SEDENTARY":
		multiplier = 1.2
	case "LIGHTLY_ACTIVE":
		multiplier = 1.375
	case "MODERATELY_ACTIVE":
		multiplier = 1.55
	case "VERY_ACTIVE":
		multiplier = 1.725
	case "EXTRA_ACTIVE":
		multiplier = 1.9
	default:
		multiplier = 1.375
	}

	return math.Round(bmr * multiplier)
}

// CalculateRecommendedCaloriesAndMacros determines caloric and macro targets based on FitnessGoal and Timeline
func CalculateRecommendedCaloriesAndMacros(tdee float64, goal string, weightKg float64, targetWeightKg float64, targetDays int) (int, int, int, int) {
	if tdee <= 0 {
		return 2000, 120, 220, 55
	}

	g := strings.ToUpper(strings.TrimSpace(goal))
	targetCalories := tdee

	// Calorie adjustments based on goal and target timeline
	switch g {
	case "LOSE_WEIGHT":
		dailyDeficit := 500.0 // Default safe deficit (~0.5 kg/week)
		if targetWeightKg > 0 && targetWeightKg < weightKg && targetDays > 0 {
			weightToLose := weightKg - targetWeightKg
			// 1 kg of body fat ~= 7,700 kcal
			calculatedDeficit := (weightToLose * 7700.0) / float64(targetDays)

			// Max safe deficit is 40% of TDEE (up to 1,200 kcal for high TDEE) to avoid metabolic crash
			maxSafeDeficit := math.Min(1200.0, tdee*0.40)
			minSafeDeficit := 300.0

			if calculatedDeficit < minSafeDeficit {
				dailyDeficit = minSafeDeficit
			} else if calculatedDeficit > maxSafeDeficit {
				dailyDeficit = maxSafeDeficit
			} else {
				dailyDeficit = calculatedDeficit
			}
		}
		targetCalories = tdee - dailyDeficit
		if targetCalories < 1200 { // Absolute physiological safety floor
			targetCalories = 1200
		}
	case "GAIN_MUSCLE":
		targetCalories = tdee + 350 // Surplus for lean muscle gain
	case "IMPROVE_ENDURANCE":
		targetCalories = tdee + 150
	case "MAINTAIN_HEALTH":
		fallthrough
	default:
		targetCalories = tdee
	}

	finalCalories := int(math.Round(targetCalories))

	// Protein calculation based on Target Weight / Lean mass (1.6 - 2.0g per kg of Target Weight)
	effectiveTargetWeight := weightKg
	if targetWeightKg > 0 {
		effectiveTargetWeight = targetWeightKg
	}

	var proteinGrams, carbsGrams, fatGrams int

	switch g {
	case "LOSE_WEIGHT":
		// 1.8g protein per kg of target weight (or 30-35% of calories)
		pG := math.Round(effectiveTargetWeight * 1.8)
		if pG < 90 {
			pG = 90
		} else if pG > 180 {
			pG = 180
		}
		proteinGrams = int(pG)
		// Fat: 25% of total calories (9 kcal/g)
		fatGrams = int(math.Round((targetCalories * 0.25) / 9.0))
		// Carbs: Remaining calories (4 kcal/g)
		usedCalories := float64(proteinGrams*4 + fatGrams*9)
		remainingCal := targetCalories - usedCalories
		if remainingCal < 0 {
			remainingCal = targetCalories * 0.40
		}
		carbsGrams = int(math.Round(remainingCal / 4.0))

	case "GAIN_MUSCLE":
		pG := math.Round(effectiveTargetWeight * 2.0)
		if pG < 110 {
			pG = 110
		}
		proteinGrams = int(pG)
		fatGrams = int(math.Round((targetCalories * 0.22) / 9.0))
		usedCalories := float64(proteinGrams*4 + fatGrams*9)
		carbsGrams = int(math.Round((targetCalories - usedCalories) / 4.0))

	case "IMPROVE_ENDURANCE":
		pG := math.Round(effectiveTargetWeight * 1.5)
		proteinGrams = int(pG)
		fatGrams = int(math.Round((targetCalories * 0.20) / 9.0))
		usedCalories := float64(proteinGrams*4 + fatGrams*9)
		carbsGrams = int(math.Round((targetCalories - usedCalories) / 4.0))

	default: // MAINTAIN_HEALTH
		pG := math.Round(effectiveTargetWeight * 1.4)
		proteinGrams = int(pG)
		fatGrams = int(math.Round((targetCalories * 0.25) / 9.0))
		usedCalories := float64(proteinGrams*4 + fatGrams*9)
		carbsGrams = int(math.Round((targetCalories - usedCalories) / 4.0))
	}

	return finalCalories, proteinGrams, carbsGrams, fatGrams
}

// CalculateWaterIntake computes daily recommended water intake in ml
func CalculateWaterIntake(weightKg float64, activityLevel string) int {
	if weightKg <= 0 {
		return 2000
	}

	baseWater := weightKg * 35.0
	act := strings.ToUpper(strings.TrimSpace(activityLevel))
	switch act {
	case "MODERATELY_ACTIVE":
		baseWater += 350
	case "VERY_ACTIVE":
		baseWater += 700
	case "EXTRA_ACTIVE":
		baseWater += 1000
	}

	return int(math.Round(baseWater))
}

// ComputeHealthSummary calculates full health profile summary for a given User
func ComputeHealthSummary(user *models.User) ComputedHealthSummary {
	bmi, category, categoryTh := CalculateBMI(user.Height, user.Weight)
	bmr := CalculateBMR(user.Gender, user.Weight, user.Height, user.Age)
	tdee := CalculateTDEE(bmr, user.ActivityLevel)

	targetDays := 365
	if user.TargetDate != nil {
		diff := user.TargetDate.Sub(time.Now())
		days := int(diff.Hours() / 24)
		if days > 0 {
			targetDays = days
		}
	}

	recCal, proteinG, carbsG, fatG := CalculateRecommendedCaloriesAndMacros(tdee, user.FitnessGoal, user.Weight, user.TargetWeight, targetDays)
	recWater := CalculateWaterIntake(user.Weight, user.ActivityLevel)

	// Ideal weight range for normal BMI (18.5 - 22.9)
	var minWeight, maxWeight float64
	if user.Height > 0 {
		heightM := user.Height / 100.0
		minWeight = math.Round(18.5*heightM*heightM*10) / 10
		maxWeight = math.Round(22.9*heightM*heightM*10) / 10
	}

	finalCal := recCal
	finalWater := recWater

	return ComputedHealthSummary{
		BMI:                 bmi,
		BMICategory:         category,
		BMICategoryTh:       categoryTh,
		BMR:                 bmr,
		TDEE:                tdee,
		RecommendedCalories: finalCal,
		TargetProteinGrams:  proteinG,
		TargetCarbsGrams:    carbsG,
		TargetFatGrams:      fatG,
		RecommendedWaterMl:  finalWater,
		IdealWeightMinKg:    minWeight,
		IdealWeightMaxKg:    maxWeight,
	}
}
