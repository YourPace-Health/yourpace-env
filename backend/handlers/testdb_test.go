package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"youpace/config"
	"youpace/models"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Handler tests that touch the database run against a real Postgres. Point
// TEST_DATABASE_URL at a throwaway database, for example:
//
//	docker run -d -e POSTGRES_PASSWORD=test -e POSTGRES_DB=youpace_test -p 55432:5432 postgres:15-alpine
//	TEST_DATABASE_URL="host=localhost port=55432 user=postgres password=test dbname=youpace_test sslmode=disable" go test ./handlers
//
// Without it these tests are skipped.
var testTables = []interface{}{
	&models.User{}, &models.UserSetting{}, &models.Exercise{}, &models.FavExercise{},
	&models.EmotionalCheckIn{}, &models.WorkoutSchedule{}, &models.WorkoutScheduleDetail{},
	&models.MealLog{}, &models.Milestone{}, &models.Equipment{}, &models.UserGoogleToken{},
	&models.UserHealthLog{}, &models.WaterLog{}, &models.WeightLog{}, &models.ChatMessage{},
}

func setupTestDB(t *testing.T) {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping database test")
	}
	t.Setenv("JWT_SECRET", "handler-test-secret")

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	if err := db.AutoMigrate(testTables...); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	config.DB = db

	truncate := func() {
		for _, m := range testTables {
			db.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(m)
		}
	}
	truncate()
	t.Cleanup(truncate)
}

func createUser(t *testing.T, email, password string, confirmed bool) models.User {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	u := models.User{Username: "tester", Email: email, PasswordHash: string(hash), EmailConfirm: confirmed}
	if err := config.DB.Create(&u).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}
	return u
}

// call runs a handler with a JSON body. email, when set, simulates the JWT
// middleware having authenticated that user.
func call(t *testing.T, h echo.HandlerFunc, method, body, email string) *httptest.ResponseRecorder {
	t.Helper()
	e := echo.New()
	req := httptest.NewRequest(method, "/", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	if email != "" {
		c.Set("email", email)
	}
	if err := h(c); err != nil {
		e.HTTPErrorHandler(err, c)
	}
	return rec
}

func decode(t *testing.T, rec *httptest.ResponseRecorder, v interface{}) {
	t.Helper()
	if err := json.Unmarshal(rec.Body.Bytes(), v); err != nil {
		t.Fatalf("decode %q: %v", rec.Body.String(), err)
	}
}

func wantStatus(t *testing.T, rec *httptest.ResponseRecorder, want int) {
	t.Helper()
	if rec.Code != want {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, want, rec.Body.String())
	}
}

var _ = http.StatusOK
