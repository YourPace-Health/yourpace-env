package handlers

import (
	"net/http"
	"testing"
	"time"

	"youpace/config"
	"youpace/models"
)

type tokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

func TestLogin(t *testing.T) {
	setupTestDB(t)
	createUser(t, "ok@example.com", "secret123", true)
	createUser(t, "unconfirmed@example.com", "secret123", false)

	cases := []struct {
		name, body string
		want       int
	}{
		{"valid", `{"email":"ok@example.com","password":"secret123"}`, http.StatusOK},
		{"wrong password", `{"email":"ok@example.com","password":"nope"}`, http.StatusUnauthorized},
		{"unknown email", `{"email":"ghost@example.com","password":"secret123"}`, http.StatusUnauthorized},
		{"email not confirmed", `{"email":"unconfirmed@example.com","password":"secret123"}`, http.StatusForbidden},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			wantStatus(t, call(t, Login, http.MethodPost, tc.body, ""), tc.want)
		})
	}
}

func TestRefreshTokenRotatesAndRejectsReuse(t *testing.T) {
	setupTestDB(t)
	createUser(t, "rt@example.com", "secret123", true)

	var first tokenPair
	rec := call(t, Login, http.MethodPost, `{"email":"rt@example.com","password":"secret123"}`, "")
	wantStatus(t, rec, http.StatusOK)
	decode(t, rec, &first)

	// 1. exchange: a new pair comes back
	// (the JWT carries second-resolution timestamps, so wait to get a different token)
	time.Sleep(1100 * time.Millisecond)
	var second tokenPair
	rec = call(t, RefreshToken, http.MethodPost, `{"refreshToken":"`+first.RefreshToken+`"}`, "")
	wantStatus(t, rec, http.StatusOK)
	decode(t, rec, &second)
	if second.AccessToken == "" || second.RefreshToken == "" || second.RefreshToken == first.RefreshToken {
		t.Fatalf("expected a rotated pair, got %+v", second)
	}

	// 2. the old refresh token is now dead
	wantStatus(t, call(t, RefreshToken, http.MethodPost, `{"refreshToken":"`+first.RefreshToken+`"}`, ""), http.StatusUnauthorized)

	// 3. the new one works
	wantStatus(t, call(t, RefreshToken, http.MethodPost, `{"refreshToken":"`+second.RefreshToken+`"}`, ""), http.StatusOK)
}

func TestRefreshTokenRejectsBadInput(t *testing.T) {
	setupTestDB(t)
	createUser(t, "bad@example.com", "secret123", true)

	var pair tokenPair
	rec := call(t, Login, http.MethodPost, `{"email":"bad@example.com","password":"secret123"}`, "")
	decode(t, rec, &pair)

	wantStatus(t, call(t, RefreshToken, http.MethodPost, `{}`, ""), http.StatusBadRequest)
	wantStatus(t, call(t, RefreshToken, http.MethodPost, `{"refreshToken":"garbage"}`, ""), http.StatusUnauthorized)
	// an access token must not be usable as a refresh token
	wantStatus(t, call(t, RefreshToken, http.MethodPost, `{"refreshToken":"`+pair.AccessToken+`"}`, ""), http.StatusUnauthorized)
}

func TestLogWeightUpdatesProfileAndHistory(t *testing.T) {
	setupTestDB(t)
	createUser(t, "w@example.com", "x", true)

	wantStatus(t, call(t, LogWeight, http.MethodPost, `{"weight":0}`, "w@example.com"), http.StatusBadRequest)
	wantStatus(t, call(t, LogWeight, http.MethodPost, `{"weight":72.5,"logDate":"2026-11-02"}`, "w@example.com"), http.StatusCreated)
	wantStatus(t, call(t, LogWeight, http.MethodPost, `{"weight":71.8,"logDate":"2026-11-01"}`, "w@example.com"), http.StatusCreated)

	var user models.User
	config.DB.Where("email = ?", "w@example.com").First(&user)
	if user.Weight != 71.8 {
		t.Errorf("profile weight = %v, want the latest logged value 71.8", user.Weight)
	}

	var logs []models.WeightLog
	rec := call(t, GetWeightHistory, http.MethodGet, "", "w@example.com")
	wantStatus(t, rec, http.StatusOK)
	decode(t, rec, &logs)
	if len(logs) != 2 || logs[0].Weight != 71.8 || logs[1].Weight != 72.5 {
		t.Errorf("history should be ordered by date ascending, got %+v", logs)
	}
}

func TestWeightHistoryIsPerUser(t *testing.T) {
	setupTestDB(t)
	createUser(t, "a@example.com", "x", true)
	createUser(t, "b@example.com", "x", true)
	call(t, LogWeight, http.MethodPost, `{"weight":60}`, "a@example.com")

	var logs []models.WeightLog
	decode(t, call(t, GetWeightHistory, http.MethodGet, "", "b@example.com"), &logs)
	if len(logs) != 0 {
		t.Errorf("user b must not see user a's logs, got %+v", logs)
	}
}

func TestCheckInIntensityAndUpsert(t *testing.T) {
	setupTestDB(t)
	createUser(t, "c@example.com", "x", true)

	cases := []struct {
		energy    string
		intensity string
	}{{"1", "LIGHT"}, {"3", "MODERATE"}, {"5", "INTENSE"}}
	for _, tc := range cases {
		rec := call(t, CheckIn, http.MethodPost, `{"energyLevel":`+tc.energy+`,"emotionalState":3}`, "c@example.com")
		wantStatus(t, rec, http.StatusOK)
		var ci models.EmotionalCheckIn
		decode(t, rec, &ci)
		if ci.AdjustedIntensity != tc.intensity {
			t.Errorf("energy %s -> %s, want %s", tc.energy, ci.AdjustedIntensity, tc.intensity)
		}
	}

	// three check-ins on the same day are one row (updated, not duplicated)
	var n int64
	config.DB.Model(&models.EmotionalCheckIn{}).Count(&n)
	if n != 1 {
		t.Errorf("rows = %d, want 1", n)
	}

	wantStatus(t, call(t, CheckIn, http.MethodPost, `{"energyLevel":9,"emotionalState":3}`, "c@example.com"), http.StatusBadRequest)
	wantStatus(t, call(t, CheckIn, http.MethodPost, `{"energyLevel":3,"emotionalState":0}`, "c@example.com"), http.StatusBadRequest)
}

func TestAuthenticatedHandlersRejectMissingUser(t *testing.T) {
	setupTestDB(t)
	// no email in context: ExtractUserID fails
	wantStatus(t, call(t, GetWeightHistory, http.MethodGet, "", ""), http.StatusNotFound)
	wantStatus(t, call(t, CheckIn, http.MethodPost, `{"energyLevel":3,"emotionalState":3}`, ""), http.StatusNotFound)
}
