package handlers

import (
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"youpace/config"
	"youpace/models"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// ---- Google sign-in ----

func googleUserInfo(body string, status int) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
		w.Write([]byte(body))
	}
}

func TestGoogleLoginCreatesAndReusesUser(t *testing.T) {
	setupTestDB(t)
	fakeGoogle(t, googleUserInfo(`{"sub":"1","name":"Gina","email":"gina@example.com","email_verified":true}`, 200))

	rec := call(t, GoogleLogin, http.MethodPost, `{"accessToken":"tok"}`, "")
	wantStatus(t, rec, http.StatusOK)
	u := userByEmail(t, "gina@example.com")
	if !u.EmailConfirm || u.Username != "Gina" || u.RefreshToken == "" {
		t.Errorf("unexpected user: %+v", u)
	}
	if countRows(&models.UserSetting{}, "user_id = ?", u.UserID) != 1 {
		t.Error("settings row missing for the new user")
	}

	wantStatus(t, call(t, GoogleLogin, http.MethodPost, `{"accessToken":"tok"}`, ""), http.StatusOK)
	if countRows(&models.User{}, "email = ?", "gina@example.com") != 1 {
		t.Error("second login must reuse the user")
	}
}

func TestGoogleLoginDerivesUsernameFromEmail(t *testing.T) {
	setupTestDB(t)
	fakeGoogle(t, googleUserInfo(`{"email":"nameless@example.com"}`, 200))
	wantStatus(t, call(t, GoogleLogin, http.MethodPost, `{"accessToken":"tok"}`, ""), http.StatusOK)
	if u := userByEmail(t, "nameless@example.com"); u.Username != "nameless" {
		t.Errorf("username = %q", u.Username)
	}
}

func TestGoogleLoginFailures(t *testing.T) {
	setupTestDB(t)
	wantStatus(t, call(t, GoogleLogin, http.MethodPost, `{bad`, ""), http.StatusBadRequest)
	wantStatus(t, call(t, GoogleLogin, http.MethodPost, `{"accessToken":""}`, ""), http.StatusBadRequest)

	fakeGoogle(t, nil)
	wantStatus(t, call(t, GoogleLogin, http.MethodPost, `{"accessToken":"t"}`, ""), http.StatusInternalServerError)

	fakeGoogle(t, googleUserInfo(`{}`, 401))
	wantStatus(t, call(t, GoogleLogin, http.MethodPost, `{"accessToken":"t"}`, ""), http.StatusUnauthorized)

	fakeGoogle(t, googleUserInfo(`not json`, 200))
	wantStatus(t, call(t, GoogleLogin, http.MethodPost, `{"accessToken":"t"}`, ""), http.StatusInternalServerError)

	fakeGoogle(t, googleUserInfo(`{"name":"No Email"}`, 200))
	wantStatus(t, call(t, GoogleLogin, http.MethodPost, `{"accessToken":"t"}`, ""), http.StatusBadRequest)
}

// ---- OAuth configuration helpers ----

func TestGoogleConfigFallbacks(t *testing.T) {
	t.Setenv("GOOGLE_CLIENT_ID", "")
	t.Setenv("GOOGLE_CLIENT_SECRET", "")
	t.Setenv("FRONTEND_URL", "")
	if GetClientID() != GoogleClientID || GetClientSecret() != GoogleClientSecret || GetFrontendURL() != "http://localhost:3000" {
		t.Error("defaults not used when the environment is empty")
	}
	t.Setenv("GOOGLE_CLIENT_ID", "id")
	t.Setenv("GOOGLE_CLIENT_SECRET", "secret")
	t.Setenv("FRONTEND_URL", "https://app.example.com")
	if GetClientID() != "id" || GetClientSecret() != "secret" || GetFrontendURL() != "https://app.example.com" {
		t.Error("environment values ignored")
	}
}

func TestRedirectURI(t *testing.T) {
	t.Setenv("GOOGLE_REDIRECT_URI", "")
	rec := callQuery(t, func(c echo.Context) error {
		return c.String(200, GetRedirectURI(c))
	}, "")
	if !strings.HasSuffix(rec.Body.String(), "/api/calendar/callback") {
		t.Errorf("uri = %s", rec.Body.String())
	}
	t.Setenv("GOOGLE_REDIRECT_URI", "https://api.example.com/cb")
	rec = callQuery(t, func(c echo.Context) error { return c.String(200, GetRedirectURI(c)) }, "")
	if rec.Body.String() != "https://api.example.com/cb" {
		t.Errorf("env override ignored: %s", rec.Body.String())
	}
}

func TestGetGoogleAuthURL(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "auth@example.com", "pw", true)
	t.Setenv("GOOGLE_CLIENT_ID", "my-client")

	wantStatus(t, call(t, GetGoogleAuthURL, http.MethodGet, "", ""), http.StatusUnauthorized)

	rec := call(t, GetGoogleAuthURL, http.MethodGet, "", "auth@example.com")
	wantStatus(t, rec, http.StatusOK)
	var body map[string]string
	decode(t, rec, &body)
	parsed, err := url.Parse(body["authUrl"])
	if err != nil {
		t.Fatal(err)
	}
	q := parsed.Query()
	if q.Get("client_id") != "my-client" || q.Get("state") != u.UserID.String() || q.Get("access_type") != "offline" {
		t.Errorf("auth url query = %v", q)
	}
}

// ---- OAuth callback ----

func tokenEndpoint(status int, body string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
		w.Write([]byte(body))
	}
}

func TestCalendarCallbackStoresAndUpdatesToken(t *testing.T) {
	setupTestDB(t)
	t.Setenv("FRONTEND_URL", "https://app.example.com")
	u := createUser(t, "cb@example.com", "pw", true)
	fakeGoogle(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Host != "oauth2.googleapis.com" {
			t.Errorf("unexpected host %s", r.URL.Host)
		}
		r.ParseForm()
		if r.Form.Get("code") != "the-code" || r.Form.Get("grant_type") != "authorization_code" {
			t.Errorf("form = %v", r.Form)
		}
		w.Write([]byte(`{"access_token":"A1","refresh_token":"R1","expires_in":3600,"token_type":"Bearer"}`))
	})

	rec := callQuery(t, GoogleCalendarCallback, "code=the-code&state="+u.UserID.String())
	wantStatus(t, rec, http.StatusFound)
	if loc := rec.Header().Get("Location"); loc != "https://app.example.com?google-calendar=connected" {
		t.Errorf("redirect = %s", loc)
	}
	var tok models.UserGoogleToken
	config.DB.First(&tok, "user_id = ?", u.UserID)
	if tok.AccessToken != "A1" || tok.RefreshToken != "R1" {
		t.Fatalf("token = %+v", tok)
	}

	// Second connect: Google returns no refresh token, the stored one must survive.
	fakeGoogle(t, tokenEndpoint(200, `{"access_token":"A2","expires_in":60,"token_type":"Bearer"}`))
	wantStatus(t, callQuery(t, GoogleCalendarCallback, "code=c&state="+u.UserID.String()), http.StatusFound)
	config.DB.First(&tok, "user_id = ?", u.UserID)
	if tok.AccessToken != "A2" || tok.RefreshToken != "R1" {
		t.Errorf("token after update = %+v", tok)
	}
}

func TestCalendarCallbackErrors(t *testing.T) {
	setupTestDB(t)
	uid := uuid.New().String()
	want := func(rec interface{ Header() http.Header }, fragment string) {
		t.Helper()
		if loc := rec.Header().Get("Location"); !strings.Contains(loc, fragment) {
			t.Errorf("Location = %q, want containing %q", loc, fragment)
		}
	}

	want(callQuery(t, GoogleCalendarCallback, ""), "missing_params")
	want(callQuery(t, GoogleCalendarCallback, "code=c&state=not-a-uuid"), "invalid_user_id")

	fakeGoogle(t, nil)
	want(callQuery(t, GoogleCalendarCallback, "code=c&state="+uid), "token_exchange_failed")

	fakeGoogle(t, tokenEndpoint(400, `{"error":"invalid_grant"}`))
	want(callQuery(t, GoogleCalendarCallback, "code=c&state="+uid), "invalid_response")

	fakeGoogle(t, tokenEndpoint(200, `not json`))
	want(callQuery(t, GoogleCalendarCallback, "code=c&state="+uid), "parse_failed")

	// a brand-new token row that cannot be stored
	fakeGoogle(t, tokenEndpoint(200, `{"access_token":"A","refresh_token":"R","expires_in":1}`))
	config.DB.Exec(`CREATE TRIGGER no_insert BEFORE INSERT ON user_google_tokens BEGIN SELECT RAISE(ABORT, 'full'); END`)
	want(callQuery(t, GoogleCalendarCallback, "code=c&state="+uid), "db_error")
}

func TestCalendarCallbackUpdateFailure(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "upd@example.com", "pw", true)
	config.DB.Create(&models.UserGoogleToken{UserID: u.UserID, AccessToken: "old", RefreshToken: "r", Expiry: time.Now()})
	config.DB.Exec(`CREATE TRIGGER no_update BEFORE UPDATE ON user_google_tokens BEGIN SELECT RAISE(ABORT, 'ro'); END`)
	fakeGoogle(t, tokenEndpoint(200, `{"access_token":"A","expires_in":1}`))
	rec := callQuery(t, GoogleCalendarCallback, "code=c&state="+u.UserID.String())
	if !strings.Contains(rec.Header().Get("Location"), "db_error") {
		t.Errorf("Location = %q", rec.Header().Get("Location"))
	}
}

// ---- status / disconnect ----

func TestCalendarStatusAndDisconnect(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "st@example.com", "pw", true)

	wantStatus(t, call(t, GetCalendarStatus, http.MethodGet, "", ""), http.StatusUnauthorized)
	wantStatus(t, call(t, DisconnectCalendar, http.MethodDelete, "", ""), http.StatusUnauthorized)

	connected := func() bool {
		rec := call(t, GetCalendarStatus, http.MethodGet, "", "st@example.com")
		wantStatus(t, rec, http.StatusOK)
		var b struct{ Connected bool }
		decode(t, rec, &b)
		return b.Connected
	}
	if connected() {
		t.Fatal("should start disconnected")
	}
	config.DB.Create(&models.UserGoogleToken{UserID: u.UserID, AccessToken: "a", RefreshToken: "r", Expiry: time.Now().Add(time.Hour)})
	if !connected() {
		t.Fatal("should be connected after a token is stored")
	}
	wantStatus(t, call(t, DisconnectCalendar, http.MethodDelete, "", "st@example.com"), http.StatusOK)
	if connected() {
		t.Error("should be disconnected again")
	}

	breakDB(t)
	wantStatus(t, call(t, DisconnectCalendar, http.MethodDelete, "", "st@example.com"), http.StatusUnauthorized)
}

// ---- token refresh ----

func TestRefreshGoogleToken(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "rf@example.com", "pw", true)
	tok := models.UserGoogleToken{UserID: u.UserID, AccessToken: "old", RefreshToken: "R", Expiry: time.Now().Add(-time.Hour)}
	config.DB.Create(&tok)

	fakeGoogle(t, tokenEndpoint(200, `{"access_token":"fresh","expires_in":3600,"token_type":"Bearer"}`))
	if err := RefreshGoogleToken(&tok); err != nil {
		t.Fatal(err)
	}
	if tok.AccessToken != "fresh" || !tok.Expiry.After(time.Now()) || tok.TokenType != "Bearer" {
		t.Errorf("token = %+v", tok)
	}

	fakeGoogle(t, tokenEndpoint(400, `{"error":"invalid_grant"}`))
	if err := RefreshGoogleToken(&tok); err == nil || !strings.Contains(err.Error(), "400") {
		t.Errorf("err = %v", err)
	}
	fakeGoogle(t, tokenEndpoint(200, `junk`))
	if err := RefreshGoogleToken(&tok); err == nil {
		t.Error("bad JSON must error")
	}
	fakeGoogle(t, nil)
	if err := RefreshGoogleToken(&tok); err == nil {
		t.Error("network failure must error")
	}
}

// ---- listing events ----

func calendarAPI(events string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Host == "oauth2.googleapis.com":
			w.Write([]byte(`{"access_token":"refreshed","expires_in":3600}`))
		case r.Method == http.MethodGet:
			w.Write([]byte(events))
		case r.Method == http.MethodPost:
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"id":"new"}`))
		case r.Method == http.MethodDelete:
			w.WriteHeader(http.StatusNoContent)
		}
	}
}

func connectCalendar(t *testing.T, email string, expiry time.Time) models.User {
	t.Helper()
	u := userByEmail(t, email)
	if err := config.DB.Create(&models.UserGoogleToken{UserID: u.UserID, AccessToken: "acc", RefreshToken: "ref", Expiry: expiry}).Error; err != nil {
		t.Fatal(err)
	}
	return u
}

func TestGetGoogleCalendarEventsSyncsYourPaceEvents(t *testing.T) {
	setupTestDB(t)
	createUser(t, "ev@example.com", "pw", true)
	u := connectCalendar(t, "ev@example.com", time.Now().Add(time.Hour))
	seedExercises(t)

	start := time.Now().Add(24 * time.Hour).UTC().Truncate(time.Minute)
	events := `{"items":[
		{"summary":"Leg day (YourPaceEvent)","start":{"dateTime":"` + start.Format(time.RFC3339) + `"},"end":{"dateTime":"` + start.Add(45*time.Minute).Format(time.RFC3339) + `"}},
		{"summary":"Dentist","start":{"dateTime":"` + start.Format(time.RFC3339) + `"}}]}`
	fakeGoogle(t, calendarAPI(events))

	wantStatus(t, call(t, GetGoogleCalendarEvents, http.MethodGet, "", ""), http.StatusUnauthorized)

	rec := call(t, GetGoogleCalendarEvents, http.MethodGet, "", "ev@example.com")
	wantStatus(t, rec, http.StatusOK)
	eventually(t, "calendar event to be synced into a schedule", func() bool {
		return countRows(&models.WorkoutSchedule{}, "user_id = ? AND title = ?", u.UserID, "Leg day") == 1
	})
	var s models.WorkoutSchedule
	config.DB.First(&s, "user_id = ?", u.UserID)
	if s.DurationMinutes != 45 || s.Status != "PENDING" {
		t.Errorf("schedule = %+v", s)
	}
}

func TestGetGoogleCalendarEventsFailureModes(t *testing.T) {
	setupTestDB(t)
	createUser(t, "evf@example.com", "pw", true)
	wantStatus(t, call(t, GetGoogleCalendarEvents, http.MethodGet, "", "evf@example.com"), http.StatusNotFound)

	connectCalendar(t, "evf@example.com", time.Now().Add(time.Hour))

	fakeGoogle(t, func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(500) })
	wantStatus(t, call(t, GetGoogleCalendarEvents, http.MethodGet, "", "evf@example.com"), http.StatusInternalServerError)

	fakeGoogle(t, calendarAPI(`not json`))
	wantStatus(t, call(t, GetGoogleCalendarEvents, http.MethodGet, "", "evf@example.com"), http.StatusInternalServerError)

	fakeGoogle(t, nil)
	wantStatus(t, call(t, GetGoogleCalendarEvents, http.MethodGet, "", "evf@example.com"), http.StatusInternalServerError)
}

func TestGetGoogleCalendarEventsRefreshesExpiredToken(t *testing.T) {
	setupTestDB(t)
	createUser(t, "exp@example.com", "pw", true)
	u := connectCalendar(t, "exp@example.com", time.Now().Add(-time.Hour))

	fakeGoogle(t, calendarAPI(`{"items":[]}`))
	wantStatus(t, call(t, GetGoogleCalendarEvents, http.MethodGet, "", "exp@example.com"), http.StatusOK)
	var tok models.UserGoogleToken
	config.DB.First(&tok, "user_id = ?", u.UserID)
	if tok.AccessToken != "refreshed" {
		t.Errorf("token not refreshed: %+v", tok)
	}

	// a revoked refresh token removes the connection
	config.DB.Model(&tok).Update("expiry", time.Now().Add(-time.Hour))
	fakeGoogle(t, tokenEndpoint(400, `{"error":"invalid_grant"}`))
	wantStatus(t, call(t, GetGoogleCalendarEvents, http.MethodGet, "", "exp@example.com"), http.StatusForbidden)
	if countRows(&models.UserGoogleToken{}, "user_id = ?", u.UserID) != 0 {
		t.Error("revoked token should be deleted")
	}
}

func TestSyncGoogleCalendarWorkoutsRules(t *testing.T) {
	setupTestDB(t)
	u := createUser(t, "sync@example.com", "pw", true)
	seedExercises(t)

	day := time.Now().AddDate(0, 0, 3).UTC().Format("2006-01-02")
	items := []map[string]interface{}{
		{"summary": ""},
		{"summary": "Meeting"},
		{"summary": "(YourPaceEvent)", "start": map[string]interface{}{"date": day}},
		{"summary": "Yoga (yourPaceEvent)", "start": map[string]interface{}{"date": day}},
		{"summary": "Yoga (yourPaceEvent)", "start": map[string]interface{}{"date": day}}, // duplicate
		{"summary": "Run (YourPaceEvent)"}, // no start: today, 30 minutes
	}
	SyncGoogleCalendarWorkouts(u.UserID, items)

	if n := countRows(&models.WorkoutSchedule{}, "user_id = ?", u.UserID); n != 3 {
		t.Fatalf("schedules = %d, want 3 (blank-title event, yoga once, run)", n)
	}
	var yoga models.WorkoutSchedule
	config.DB.First(&yoga, "user_id = ? AND title = ?", u.UserID, "Yoga")
	if yoga.DurationMinutes != 30 || yoga.BurnedCalories <= 0 {
		t.Errorf("yoga = %+v", yoga)
	}
	if countRows(&models.WorkoutScheduleDetail{}, "workout_schedule_id = ?", yoga.ScheduleID) != 3 {
		t.Error("expected three exercises attached")
	}
}

// ---- creating and deleting events ----

func TestCreateGoogleCalendarWorkoutEvent(t *testing.T) {
	setupTestDB(t)
	createUser(t, "mk@example.com", "pw", true)
	u := userByEmail(t, "mk@example.com")

	// not connected: nothing happens, no error
	if err := CreateGoogleCalendarWorkoutEvent(u.UserID, "Run", time.Now(), 30, 100, ""); err != nil {
		t.Fatal(err)
	}

	connectCalendar(t, "mk@example.com", time.Now().Add(time.Hour))
	var posted string
	fakeGoogle(t, func(w http.ResponseWriter, r *http.Request) {
		buf := new(strings.Builder)
		b := make([]byte, 4096)
		n, _ := r.Body.Read(b)
		buf.Write(b[:n])
		posted = buf.String()
		w.WriteHeader(200)
	})
	midnight := time.Date(2026, 11, 20, 0, 0, 0, 0, time.UTC)
	if err := CreateGoogleCalendarWorkoutEvent(u.UserID, "Run", midnight, 0, 120, "felt great"); err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"Run (YourPaceEvent)", "felt great", "Asia/Bangkok"} {
		if !strings.Contains(posted, want) {
			t.Errorf("payload missing %q: %s", want, posted)
		}
	}

	// already tagged titles are not tagged twice
	if err := CreateGoogleCalendarWorkoutEvent(u.UserID, "Swim (YourPaceEvent)", time.Now(), 20, 50, ""); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(posted, "(YourPaceEvent) (YourPaceEvent)") {
		t.Error("tag duplicated")
	}

	fakeGoogle(t, func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(403) })
	if err := CreateGoogleCalendarWorkoutEvent(u.UserID, "Run", time.Now(), 30, 1, ""); err == nil {
		t.Error("API rejection must surface")
	}
	fakeGoogle(t, nil)
	if err := CreateGoogleCalendarWorkoutEvent(u.UserID, "Run", time.Now(), 30, 1, ""); err == nil {
		t.Error("network failure must surface")
	}
}

func TestCreateEventRefreshesExpiredToken(t *testing.T) {
	setupTestDB(t)
	createUser(t, "mk2@example.com", "pw", true)
	u := connectCalendar(t, "mk2@example.com", time.Now().Add(-time.Hour))

	fakeGoogle(t, calendarAPI(""))
	if err := CreateGoogleCalendarWorkoutEvent(u.UserID, "Run", time.Now(), 30, 1, ""); err != nil {
		t.Fatal(err)
	}
	fakeGoogle(t, tokenEndpoint(400, `{}`))
	config.DB.Model(&models.UserGoogleToken{}).Where("user_id = ?", u.UserID).Update("expiry", time.Now().Add(-time.Hour))
	if err := CreateGoogleCalendarWorkoutEvent(u.UserID, "Run", time.Now(), 30, 1, ""); err == nil {
		t.Error("a failed refresh must surface")
	}
}

func TestDeleteGoogleCalendarWorkoutEvents(t *testing.T) {
	setupTestDB(t)
	createUser(t, "del@example.com", "pw", true)
	u := userByEmail(t, "del@example.com")

	if err := DeleteGoogleCalendarWorkoutEvents(u.UserID); err != nil {
		t.Fatalf("not connected should be a no-op: %v", err)
	}

	connectCalendar(t, "del@example.com", time.Now().Add(time.Hour))
	var deleted []string
	fakeGoogle(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			deleted = append(deleted, r.URL.Path)
			w.WriteHeader(204)
			return
		}
		w.Write([]byte(`{"items":[{"id":"e1","summary":"Run (YourPaceEvent)"},{"id":"e2","summary":"Lunch"},{"id":"e3","summary":"yourpaceevent swim"}]}`))
	})
	if err := DeleteGoogleCalendarWorkoutEvents(u.UserID); err != nil {
		t.Fatal(err)
	}
	if len(deleted) != 2 || !strings.HasSuffix(deleted[0], "/e1") || !strings.HasSuffix(deleted[1], "/e3") {
		t.Errorf("deleted = %v", deleted)
	}

	fakeGoogle(t, func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(500) })
	if err := DeleteGoogleCalendarWorkoutEvents(u.UserID); err == nil {
		t.Error("list failure must surface")
	}
	fakeGoogle(t, calendarAPI("junk"))
	if err := DeleteGoogleCalendarWorkoutEvents(u.UserID); err == nil {
		t.Error("bad JSON must surface")
	}
	fakeGoogle(t, nil)
	if err := DeleteGoogleCalendarWorkoutEvents(u.UserID); err == nil {
		t.Error("network failure must surface")
	}

	// expired token that cannot be refreshed
	config.DB.Model(&models.UserGoogleToken{}).Where("user_id = ?", u.UserID).Update("expiry", time.Now().Add(-time.Hour))
	fakeGoogle(t, tokenEndpoint(400, `{}`))
	if err := DeleteGoogleCalendarWorkoutEvents(u.UserID); err == nil {
		t.Error("refresh failure must surface")
	}
}

func TestDeleteGoogleCalendarWorkoutEventsHandler(t *testing.T) {
	setupTestDB(t)
	createUser(t, "dh@example.com", "pw", true)
	wantStatus(t, call(t, DeleteGoogleCalendarWorkoutEventsHandler, http.MethodDelete, "", ""), http.StatusUnauthorized)
	wantStatus(t, call(t, DeleteGoogleCalendarWorkoutEventsHandler, http.MethodDelete, "", "dh@example.com"), http.StatusOK)

	connectCalendar(t, "dh@example.com", time.Now().Add(time.Hour))
	fakeGoogle(t, func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(500) })
	wantStatus(t, call(t, DeleteGoogleCalendarWorkoutEventsHandler, http.MethodDelete, "", "dh@example.com"), http.StatusInternalServerError)
}
