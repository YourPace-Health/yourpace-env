package handlers

import (
	"net/http"
	"testing"

	"youpace/config"
	"youpace/models"
	"youpace/services"
)

func TestRegisterCreatesUnconfirmedUserAndSettings(t *testing.T) {
	setupTestDB(t)
	rec := call(t, Register, http.MethodPost,
		`{"username":"New","email":"new@example.com","password":"pw123456","dob":"1995-04-02"}`, "")
	wantStatus(t, rec, http.StatusCreated)

	u := userByEmail(t, "new@example.com")
	if u.EmailConfirm || u.DOB == nil || u.DOB.Year() != 1995 || u.PasswordHash == "pw123456" {
		t.Errorf("unexpected user: %+v", u)
	}
	if countRows(&models.UserSetting{}, "user_id = ?", u.UserID) != 1 {
		t.Error("default settings row missing")
	}
}

func TestRegisterRejectsBadBodyAndConfirmedDuplicate(t *testing.T) {
	setupTestDB(t)
	wantStatus(t, call(t, Register, http.MethodPost, `{not json`, ""), http.StatusBadRequest)

	createUser(t, "dup@example.com", "pw", true)
	wantStatus(t, call(t, Register, http.MethodPost,
		`{"username":"x","email":"dup@example.com","password":"pw"}`, ""), http.StatusConflict)
}

func TestRegisterAgainBeforeConfirmingUpdatesTheAccount(t *testing.T) {
	setupTestDB(t)
	createUser(t, "again@example.com", "oldpw", false)

	rec := call(t, Register, http.MethodPost,
		`{"username":"Renamed","email":"again@example.com","password":"newpw","dob":"2000-01-31"}`, "")
	wantStatus(t, rec, http.StatusCreated)

	u := userByEmail(t, "again@example.com")
	if u.Username != "Renamed" || u.DOB == nil || u.DOB.Day() != 31 {
		t.Errorf("user not updated: %+v", u)
	}
	wantStatus(t, call(t, Login, http.MethodPost, `{"email":"again@example.com","password":"oldpw"}`, ""), http.StatusUnauthorized)
}

func TestRegisterIgnoresMalformedDOB(t *testing.T) {
	setupTestDB(t)
	wantStatus(t, call(t, Register, http.MethodPost,
		`{"username":"x","email":"dob@example.com","password":"pw","dob":"not-a-date"}`, ""), http.StatusCreated)
	if u := userByEmail(t, "dob@example.com"); u.DOB != nil {
		t.Errorf("DOB = %v, want nil", u.DOB)
	}
}

func TestLoginBadBody(t *testing.T) {
	setupTestDB(t)
	wantStatus(t, call(t, Login, http.MethodPost, `{bad`, ""), http.StatusBadRequest)
}

func TestVerifyOTPConfirmsEmail(t *testing.T) {
	setupTestDB(t)
	mr := useMiniRedis(t)
	createUser(t, "otp@example.com", "pw", false)
	mr.Set("otp:otp@example.com", "654321")

	wantStatus(t, call(t, VerifyOTP, http.MethodPost, `{"email":"otp@example.com","otp":"111111"}`, ""), http.StatusBadRequest)
	if userByEmail(t, "otp@example.com").EmailConfirm {
		t.Fatal("a wrong code must not confirm the account")
	}

	wantStatus(t, call(t, VerifyOTP, http.MethodPost, `{"email":"otp@example.com","otp":"654321"}`, ""), http.StatusOK)
	if !userByEmail(t, "otp@example.com").EmailConfirm {
		t.Error("account should be confirmed")
	}
}

func TestVerifyOTPErrorPaths(t *testing.T) {
	setupTestDB(t)
	wantStatus(t, call(t, VerifyOTP, http.MethodPost, `{bad`, ""), http.StatusBadRequest)

	// Redis not configured -> the service reports an error
	wantStatus(t, call(t, VerifyOTP, http.MethodPost, `{"email":"a@example.com","otp":"1"}`, ""), http.StatusInternalServerError)

	// valid code but no such user
	mr := useMiniRedis(t)
	mr.Set("otp:ghost@example.com", "123456")
	wantStatus(t, call(t, VerifyOTP, http.MethodPost, `{"email":"ghost@example.com","otp":"123456"}`, ""), http.StatusNotFound)
}

func TestVerifyOTPSaveFailure(t *testing.T) {
	setupTestDB(t)
	mr := useMiniRedis(t)
	createUser(t, "save@example.com", "pw", false)
	mr.Set("otp:save@example.com", "123456")
	// make the UPDATE fail while the SELECT still works
	config.DB.Exec(`CREATE TRIGGER no_update BEFORE UPDATE ON users BEGIN SELECT RAISE(ABORT, 'read only'); END`)
	wantStatus(t, call(t, VerifyOTP, http.MethodPost, `{"email":"save@example.com","otp":"123456"}`, ""), http.StatusInternalServerError)
}

func TestRequestOTP(t *testing.T) {
	setupTestDB(t)
	createUser(t, "req@example.com", "pw", false)

	wantStatus(t, call(t, RequestOTP, http.MethodGet, "", ""), http.StatusBadRequest)

	e := callQuery(t, RequestOTP, "email=ghost@example.com")
	wantStatus(t, e, http.StatusNotFound)

	mr := useMiniRedis(t)
	wantStatus(t, callQuery(t, RequestOTP, "email=req@example.com"), http.StatusOK)
	if code, err := mr.Get("otp:req@example.com"); err != nil || len(code) != 6 {
		t.Errorf("otp not stored: %q %v", code, err)
	}

	t.Setenv("MAIL_ENABLED", "true") // real provider without credentials -> send fails
	t.Setenv("MAIL_USERNAME", "")
	wantStatus(t, callQuery(t, RequestOTP, "email=req@example.com"), http.StatusInternalServerError)
}

func TestMagicLinkFlow(t *testing.T) {
	setupTestDB(t)
	createUser(t, "magic@example.com", "pw", false)

	wantStatus(t, call(t, RequestMagicLink, http.MethodPost, `{bad`, ""), http.StatusBadRequest)
	wantStatus(t, call(t, RequestMagicLink, http.MethodPost, `{"email":"ghost@example.com"}`, ""), http.StatusNotFound)
	wantStatus(t, call(t, RequestMagicLink, http.MethodPost, `{"email":"magic@example.com"}`, ""), http.StatusOK)

	t.Setenv("MAIL_ENABLED", "true")
	t.Setenv("MAIL_USERNAME", "")
	wantStatus(t, call(t, RequestMagicLink, http.MethodPost, `{"email":"magic@example.com"}`, ""), http.StatusInternalServerError)
	t.Setenv("MAIL_ENABLED", "false")

	token, err := services.GenerateMagicToken("magic@example.com")
	if err != nil {
		t.Fatal(err)
	}
	rec := call(t, VerifyMagicLink, http.MethodPost, `{"token":"`+token+`"}`, "")
	wantStatus(t, rec, http.StatusOK)
	var pair struct {
		AccessToken  string `json:"accessToken"`
		RefreshToken string `json:"refreshToken"`
	}
	decode(t, rec, &pair)
	if pair.AccessToken == "" || pair.RefreshToken == "" {
		t.Errorf("missing tokens: %+v", pair)
	}
	u := userByEmail(t, "magic@example.com")
	if !u.EmailConfirm || u.RefreshToken != pair.RefreshToken {
		t.Errorf("magic login should confirm the email and store the refresh token: %+v", u)
	}
}

func TestVerifyMagicLinkRejections(t *testing.T) {
	setupTestDB(t)
	createUser(t, "m2@example.com", "pw", true)

	wantStatus(t, call(t, VerifyMagicLink, http.MethodPost, `{bad`, ""), http.StatusBadRequest)
	wantStatus(t, call(t, VerifyMagicLink, http.MethodPost, `{"token":"garbage"}`, ""), http.StatusUnauthorized)

	access, _ := services.GenerateAccessToken("m2@example.com")
	wantStatus(t, call(t, VerifyMagicLink, http.MethodPost, `{"token":"`+access+`"}`, ""), http.StatusUnauthorized)

	ghost, _ := services.GenerateMagicToken("ghost@example.com")
	wantStatus(t, call(t, VerifyMagicLink, http.MethodPost, `{"token":"`+ghost+`"}`, ""), http.StatusNotFound)
}

func TestRefreshTokenRejections(t *testing.T) {
	setupTestDB(t)
	createUser(t, "r@example.com", "pw", true)

	wantStatus(t, call(t, RefreshToken, http.MethodPost, `{bad`, ""), http.StatusBadRequest)
	wantStatus(t, call(t, RefreshToken, http.MethodPost, `{"refreshToken":""}`, ""), http.StatusBadRequest)
	wantStatus(t, call(t, RefreshToken, http.MethodPost, `{"refreshToken":"nope"}`, ""), http.StatusUnauthorized)

	// a well-formed token that is not the one stored for the user
	stale, _ := services.GenerateRefreshToken("r@example.com")
	wantStatus(t, call(t, RefreshToken, http.MethodPost, `{"refreshToken":"`+stale+`"}`, ""), http.StatusUnauthorized)

	// a refresh token for an unknown user
	ghost, _ := services.GenerateRefreshToken("ghost@example.com")
	wantStatus(t, call(t, RefreshToken, http.MethodPost, `{"refreshToken":"`+ghost+`"}`, ""), http.StatusUnauthorized)

	// access tokens are not accepted as refresh tokens
	access, _ := services.GenerateAccessToken("r@example.com")
	wantStatus(t, call(t, RefreshToken, http.MethodPost, `{"refreshToken":"`+access+`"}`, ""), http.StatusUnauthorized)
}

func TestRefreshTokenSaveFailure(t *testing.T) {
	setupTestDB(t)
	createUser(t, "rs@example.com", "pw", true)
	rec := call(t, Login, http.MethodPost, `{"email":"rs@example.com","password":"pw"}`, "")
	var pair tokenPair
	decode(t, rec, &pair)
	config.DB.Exec(`CREATE TRIGGER no_update BEFORE UPDATE ON users BEGIN SELECT RAISE(ABORT, 'read only'); END`)
	wantStatus(t, call(t, RefreshToken, http.MethodPost, `{"refreshToken":"`+pair.RefreshToken+`"}`, ""), http.StatusInternalServerError)
}
