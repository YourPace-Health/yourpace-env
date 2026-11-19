package main

import (
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"youpace/config"
	"youpace/models"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestAllowedOrigins(t *testing.T) {
	t.Setenv("FRONTEND_URL", "")
	if got := allowedOrigins(); !reflect.DeepEqual(got, []string{"*"}) {
		t.Errorf("unset FRONTEND_URL = %v, want [*]", got)
	}

	t.Setenv("FRONTEND_URL", "https://a.example.com/, https://b.example.com ,")
	got := allowedOrigins()
	want := []string{"http://localhost:3000", "http://localhost:5173", "https://a.example.com", "https://b.example.com"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
}

func TestHealthRoutes(t *testing.T) {
	e := echo.New()
	registerHealthRoutes(e)

	for _, path := range []string{"/", "/health"} {
		for _, method := range []string{http.MethodGet, http.MethodHead} {
			rec := httptest.NewRecorder()
			e.ServeHTTP(rec, httptest.NewRequest(method, path, nil))
			if rec.Code != http.StatusOK {
				t.Errorf("%s %s = %d, want 200", method, path, rec.Code)
			}
		}
	}

	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/health", nil))
	if rec.Code == http.StatusOK {
		t.Error("POST /health should not be served")
	}
}

// ---- routes and seeding ----

func TestNewAppRoutesAreProtected(t *testing.T) {
	t.Setenv("JWT_SECRET", "main-test-secret")
	t.Setenv("FRONTEND_URL", "")
	e := newApp()

	routes := map[string]bool{}
	for _, r := range e.Routes() {
		routes[r.Method+" "+r.Path] = true
	}
	for _, want := range []string{
		"POST /api/auth/login", "POST /api/auth/register", "POST /api/auth/refresh",
		"GET /api/users/profile", "POST /api/meals/log", "GET /api/schedules",
		"GET /api/calendar/callback", "GET /health", "POST /api/mentor/chat",
	} {
		if !routes[want] {
			t.Errorf("route %q is not registered", want)
		}
	}

	// every /api route except the public auth ones and the OAuth callback needs a token
	for _, r := range e.Routes() {
		if r.Path == "/api/calendar/callback" || len(r.Path) < 5 || r.Path[:5] != "/api/" {
			continue
		}
		if len(r.Path) >= 10 && r.Path[:10] == "/api/auth/" {
			continue
		}
		if r.Method == "echo_route_not_found" || r.Method == "" {
			continue
		}
		path := r.Path
		for _, p := range []string{":id"} {
			path = strings.ReplaceAll(path, p, "1")
		}
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, httptest.NewRequest(r.Method, path, nil))
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s without a token = %d, want 401", r.Method, r.Path, rec.Code)
		}
	}
}

func TestNewAppAnswersHealthAndCORS(t *testing.T) {
	t.Setenv("JWT_SECRET", "main-test-secret")
	t.Setenv("FRONTEND_URL", "https://app.example.com")
	e := newApp()

	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/health", nil))
	if rec.Code != http.StatusOK {
		t.Errorf("/health = %d", rec.Code)
	}

	req := httptest.NewRequest(http.MethodOptions, "/api/auth/login", nil)
	req.Header.Set("Origin", "https://app.example.com")
	req.Header.Set("Access-Control-Request-Method", "POST")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://app.example.com" {
		t.Errorf("CORS allow-origin = %q", got)
	}

	req = httptest.NewRequest(http.MethodOptions, "/api/auth/login", nil)
	req.Header.Set("Origin", "https://evil.example.com")
	req.Header.Set("Access-Control-Request-Method", "POST")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("a foreign origin was allowed: %q", got)
	}
}

func TestSeedDefaultEquipmentsIsIdempotentAndRefreshesLabels(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:seedtest?mode=memory&cache=shared"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(1)
	defer sqlDB.Close()
	if err := db.Exec(`CREATE TABLE equipment (
		equipment_id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
		icon TEXT, created_at DATETIME, updated_at DATETIME)`).Error; err != nil {
		t.Fatal(err)
	}
	// the models rely on Postgres to generate UUIDs; do it here instead
	db.Callback().Create().Before("gorm:create").Register("seed:uuid", func(tx *gorm.DB) {
		if eq, ok := tx.Statement.Dest.(*models.Equipment); ok && eq.EquipmentID == uuid.Nil {
			eq.EquipmentID = uuid.New()
		}
	})
	old := config.DB
	config.DB = db
	defer func() { config.DB = old }()

	// one pre-existing row with a stale label must be refreshed, not duplicated
	db.Create(&models.Equipment{Name: "Dumbbells", DisplayName: "stale", Icon: "?"})

	seedDefaultEquipments()
	seedDefaultEquipments()

	var n int64
	db.Model(&models.Equipment{}).Count(&n)
	if n != 22 {
		t.Errorf("equipment rows = %d, want 22", n)
	}
	var dumbbells models.Equipment
	db.First(&dumbbells, "name = ?", "Dumbbells")
	if dumbbells.DisplayName == "stale" {
		t.Error("existing equipment label was not refreshed")
	}
}
