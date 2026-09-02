package services_test

import (
	"testing"
	"time"
	"youpace/models"
	"youpace/services"
)

func TestCalculateBMI(t *testing.T) {
	tests := []struct {
		name         string
		heightCm     float64
		weightKg     float64
		expectedBMI  float64
		expectedCat  string
		expectedTh   string
	}{
		{"Invalid input zero height", 0, 70, 0, "UNKNOWN", "ไม่ระบุ"},
		{"Invalid input negative weight", 175, -10, 0, "UNKNOWN", "ไม่ระบุ"},
		{"Underweight", 175, 50, 16.33, "UNDERWEIGHT", "น้ำหนักน้อยกว่าเกณฑ์"},
		{"Normal Weight", 175, 68, 22.2, "NORMAL", "น้ำหนักปกติ สมส่วน"},
		{"Overweight", 175, 75, 24.49, "OVERWEIGHT", "น้ำหนักเกิน (ท่วม)"},
		{"Obese Stage 1", 175, 85, 27.76, "OBESE_STAGE_1", "อ้วนระดับ 1"},
		{"Obese Stage 2", 175, 105, 34.29, "OBESE_STAGE_2", "อ้วนระดับ 2 (อ้วนมาก)"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			bmi, cat, catTh := services.CalculateBMI(tc.heightCm, tc.weightKg)
			if bmi != tc.expectedBMI {
				t.Errorf("CalculateBMI(%v, %v) bmi = %v, expected %v", tc.heightCm, tc.weightKg, bmi, tc.expectedBMI)
			}
			if cat != tc.expectedCat {
				t.Errorf("CalculateBMI(%v, %v) category = %v, expected %v", tc.heightCm, tc.weightKg, cat, tc.expectedCat)
			}
			if catTh != tc.expectedTh {
				t.Errorf("CalculateBMI(%v, %v) categoryTh = %v, expected %v", tc.heightCm, tc.weightKg, catTh, tc.expectedTh)
			}
		})
	}
}

func TestCalculateAdjustedWeight(t *testing.T) {
	// Normal weight should return actual weight
	w := services.CalculateAdjustedWeight(170, 65)
	if w != 65 {
		t.Errorf("Expected actual weight 65, got %v", w)
	}

	// Zero input
	if services.CalculateAdjustedWeight(0, 80) != 80 {
		t.Errorf("Expected unchanged weight on 0 height")
	}
	if services.CalculateAdjustedWeight(170, 0) != 0 {
		t.Errorf("Expected 0 on 0 weight")
	}

	// Overweight (> 120% ideal)
	overW := services.CalculateAdjustedWeight(170, 100)
	if overW >= 100 || overW <= 63.58 {
		t.Errorf("Expected adjusted weight between ideal and actual, got %v", overW)
	}
}

func TestCalculateBMR(t *testing.T) {
	// Male BMR
	bmrMale := services.CalculateBMR("MALE", 70, 175, 25)
	if bmrMale <= 1000 || bmrMale >= 2500 {
		t.Errorf("Unexpected male BMR: %v", bmrMale)
	}

	// Female BMR variations
	bmrFemale := services.CalculateBMR("FEMALE", 55, 160, 25)
	if bmrFemale <= 800 || bmrFemale >= 2000 {
		t.Errorf("Unexpected female BMR: %v", bmrFemale)
	}

	bmrFemaleTh := services.CalculateBMR("หญิง", 55, 160, 25)
	if bmrFemaleTh != bmrFemale {
		t.Errorf("Expected Thai gender string to match female BMR")
	}

	bmrF := services.CalculateBMR("F", 55, 160, 25)
	if bmrF != bmrFemale {
		t.Errorf("Expected F gender string to match female BMR")
	}

	// Negative and Zero input edge cases
	if services.CalculateBMR("MALE", 0, 170, 20) != 0 {
		t.Errorf("Expected 0 BMR on 0 weight")
	}
	if services.CalculateBMR("MALE", 70, 0, 20) != 0 {
		t.Errorf("Expected 0 BMR on 0 height")
	}
	if services.CalculateBMR("MALE", 70, 170, 0) != 0 {
		t.Errorf("Expected 0 BMR on 0 age")
	}
}

func TestCalculateTDEE(t *testing.T) {
	bmr := 1600.0

	tests := []struct {
		activity string
		minTDEE  float64
		maxTDEE  float64
	}{
		{"SEDENTARY", 1900, 1950},
		{"LIGHTLY_ACTIVE", 2150, 2250},
		{"MODERATELY_ACTIVE", 2450, 2550},
		{"VERY_ACTIVE", 2700, 2800},
		{"EXTRA_ACTIVE", 3000, 3100},
		{"UNKNOWN", 2150, 2250},
	}

	for _, tc := range tests {
		t.Run(tc.activity, func(t *testing.T) {
			tdee := services.CalculateTDEE(bmr, tc.activity)
			if tdee < tc.minTDEE || tdee > tc.maxTDEE {
				t.Errorf("CalculateTDEE for %s = %v, expected between %v and %v", tc.activity, tdee, tc.minTDEE, tc.maxTDEE)
			}
		})
	}

	if services.CalculateTDEE(0, "SEDENTARY") != 0 {
		t.Errorf("Expected 0 TDEE on 0 BMR")
	}
}

func TestCalculateRecommendedCaloriesAndMacros(t *testing.T) {
	tdee := 2200.0

	// Lose weight goal with normal target timeline
	cal, p, c, f := services.CalculateRecommendedCaloriesAndMacros(tdee, "LOSE_WEIGHT", 80, 70, 90)
	if cal >= int(tdee) || p <= 0 || c <= 0 || f <= 0 {
		t.Errorf("Lose weight calories should be deficit, got cal=%v, p=%v, c=%v, f=%v", cal, p, c, f)
	}

	// Lose weight with extreme deficit test (safety floor)
	calExtreme, _, _, _ := services.CalculateRecommendedCaloriesAndMacros(tdee, "LOSE_WEIGHT", 100, 50, 10)
	if calExtreme < 1200 {
		t.Errorf("Calories must not drop below 1200 safety floor")
	}

	// Lose weight with very small deficit (< minSafeDeficit)
	calSmall, _, _, _ := services.CalculateRecommendedCaloriesAndMacros(tdee, "LOSE_WEIGHT", 70.5, 70.0, 365)
	if calSmall >= int(tdee) {
		t.Errorf("Calories should have deficit")
	}

	// Lose weight with low protein boundary (< 90g)
	_, pLow, _, _ := services.CalculateRecommendedCaloriesAndMacros(1500, "LOSE_WEIGHT", 40, 38, 90)
	if pLow < 90 {
		t.Errorf("Protein floor in lose weight should be >= 90g, got %d", pLow)
	}

	// Lose weight with high protein boundary (> 180g)
	_, pHigh, _, _ := services.CalculateRecommendedCaloriesAndMacros(3500, "LOSE_WEIGHT", 120, 110, 90)
	if pHigh > 180 {
		t.Errorf("Protein cap in lose weight should be <= 180g, got %d", pHigh)
	}

	// Lose weight with remainingCal < 0 branch
	_, _, cNeg, _ := services.CalculateRecommendedCaloriesAndMacros(1200, "LOSE_WEIGHT", 90, 85, 30)
	if cNeg <= 0 {
		t.Errorf("Carbs should be positive even when calories are tight")
	}

	// Gain muscle goal with low protein boundary (< 110g)
	calGain, pGain, cGain, fGain := services.CalculateRecommendedCaloriesAndMacros(tdee, "GAIN_MUSCLE", 45, 50, 90)
	if calGain <= int(tdee) || pGain < 110 || cGain <= 0 || fGain <= 0 {
		t.Errorf("Gain muscle calories error, got cal=%v, p=%v, c=%v, f=%v", calGain, pGain, cGain, fGain)
	}

	// Improve endurance goal
	calEnd, pEnd, cEnd, fEnd := services.CalculateRecommendedCaloriesAndMacros(tdee, "IMPROVE_ENDURANCE", 70, 70, 90)
	if calEnd <= int(tdee) || pEnd <= 0 || cEnd <= 0 || fEnd <= 0 {
		t.Errorf("Endurance calories error, got cal=%v, p=%v, c=%v, f=%v", calEnd, pEnd, cEnd, fEnd)
	}

	// Maintain health goal
	calMain, pMain, cMain, fMain := services.CalculateRecommendedCaloriesAndMacros(tdee, "MAINTAIN_HEALTH", 70, 70, 90)
	if calMain != int(tdee) || pMain <= 0 || cMain <= 0 || fMain <= 0 {
		t.Errorf("Maintain calories should match TDEE, got cal=%v, p=%v, c=%v, f=%v", calMain, pMain, cMain, fMain)
	}

	// Zero TDEE fallback
	fCal, _, _, _ := services.CalculateRecommendedCaloriesAndMacros(0, "MAINTAIN_HEALTH", 70, 70, 90)
	if fCal != 2000 {
		t.Errorf("Expected 2000 default on 0 TDEE")
	}
}

func TestCalculateWaterIntake(t *testing.T) {
	w := services.CalculateWaterIntake(70, "SEDENTARY")
	if w <= 2000 || w >= 3000 {
		t.Errorf("Expected water intake ~2450ml for 70kg sedentary, got %v", w)
	}

	wMod := services.CalculateWaterIntake(70, "MODERATELY_ACTIVE")
	if wMod <= w {
		t.Errorf("Moderately active should drink more water than sedentary")
	}

	wVery := services.CalculateWaterIntake(70, "VERY_ACTIVE")
	if wVery <= wMod {
		t.Errorf("Very active should drink more water than moderately active")
	}

	wExtra := services.CalculateWaterIntake(70, "EXTRA_ACTIVE")
	if wExtra <= wVery {
		t.Errorf("Extra active should drink more water than very active")
	}

	if services.CalculateWaterIntake(0, "SEDENTARY") != 2000 {
		t.Errorf("Expected default 2000ml for 0kg")
	}
}

func TestComputeHealthSummary(t *testing.T) {
	futureDate := time.Now().AddDate(0, 3, 0)
	user := &models.User{
		Age:           28,
		Gender:        "MALE",
		Height:        175,
		Weight:        75,
		TargetWeight:  68,
		TargetDate:    &futureDate,
		FitnessGoal:   "LOSE_WEIGHT",
		ActivityLevel: "LIGHTLY_ACTIVE",
	}

	summary := services.ComputeHealthSummary(user)
	if summary.BMI <= 0 || summary.BMR <= 0 || summary.TDEE <= 0 || summary.RecommendedCalories <= 0 {
		t.Errorf("Invalid summary results")
	}

	// Test with nil TargetDate and zero Height
	userNoTarget := &models.User{
		Age:           25,
		Gender:        "FEMALE",
		Height:        0,
		Weight:        60,
		TargetDate:    nil,
		FitnessGoal:   "MAINTAIN_HEALTH",
		ActivityLevel: "SEDENTARY",
	}
	summaryNoTarget := services.ComputeHealthSummary(userNoTarget)
	if summaryNoTarget.IdealWeightMinKg != 0 || summaryNoTarget.IdealWeightMaxKg != 0 {
		t.Errorf("Ideal weight should be 0 for 0 height")
	}
}
