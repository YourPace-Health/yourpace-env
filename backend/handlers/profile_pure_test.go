package handlers

import (
	"net/http"
	"testing"
)

// These run without a database.

func TestProfileRequiresSignIn(t *testing.T) {
	// these used to panic on an unchecked type assertion when no user was in the context
	for _, h := range []func(t *testing.T) int{
		func(t *testing.T) int { return call(t, GetUserProfile, http.MethodGet, "", "").Code },
		func(t *testing.T) int { return call(t, UpdateUserProfile, http.MethodPut, `{}`, "").Code },
		func(t *testing.T) int { return call(t, GetUserSetting, http.MethodGet, "", "").Code },
		func(t *testing.T) int { return call(t, UpdateUserSetting, http.MethodPut, `{}`, "").Code },
	} {
		if code := h(t); code != http.StatusUnauthorized {
			t.Errorf("status = %d, want 401", code)
		}
	}
}

func TestCalculateLevelInfo(t *testing.T) {
	cases := []struct {
		exp     int
		code    string
		percent float64
	}{
		{0, "R1", 0},
		{250, "R1", 50},
		{499, "R1", 99.8},
		{500, "R2", 0},
		{1000, "R2", 50},
		{1500, "R3", 0},
		{3500, "R4", 0},
		{7000, "R5", 0},
		{15000, "R5", 100},
		{99999, "R5", 100},
		{-50, "R1", 0},
	}
	for _, tc := range cases {
		got := calculateLevelInfo(tc.exp)
		if got.LevelCode != tc.code || got.ProgressPercentage != tc.percent {
			t.Errorf("exp %d -> %s %.1f%%, want %s %.1f%%", tc.exp, got.LevelCode, got.ProgressPercentage, tc.code, tc.percent)
		}
	}
}
