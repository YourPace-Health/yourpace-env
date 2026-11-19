package handlers

import (
	"context"
	"database/sql"
	"time"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"reflect"
	"sort"
	"strings"
	"sync/atomic"
	"testing"

	"youpace/config"
	"youpace/models"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

// Handler tests that touch the database run against a real Postgres. Point
// TEST_DATABASE_URL at a throwaway database, for example:
//
//	docker run -d -e POSTGRES_PASSWORD=test -e POSTGRES_DB=youpace_test -p 55432:5432 postgres:15-alpine
//	TEST_DATABASE_URL="host=localhost port=55432 user=postgres password=test dbname=youpace_test sslmode=disable" go test ./handlers
//
// Without it the tests run against an in-memory SQLite database (no Docker needed).
// testTables mirrors the order used by AutoMigrate in main.go: parents before children, so
// foreign keys can be created on a fresh database. Tables are emptied in reverse order.
var testTables = []interface{}{
	&models.User{}, &models.UserSetting{}, &models.Exercise{}, &models.FavExercise{},
	&models.EmotionalCheckIn{}, &models.WorkoutSchedule{}, &models.WorkoutScheduleDetail{},
	&models.MealLog{}, &models.Milestone{}, &models.Equipment{}, &models.UserGoogleToken{},
	&models.UserHealthLog{}, &models.WaterLog{}, &models.WeightLog{}, &models.ChatMessage{},
}

func setupTestDB(t *testing.T) {
	t.Helper()
	t.Setenv("JWT_SECRET", "handler-test-secret")
	t.Setenv("MAIL_ENABLED", "false") // mock mail: never touch a real provider

	var db *gorm.DB
	var err error
	if dsn := os.Getenv("TEST_DATABASE_URL"); dsn != "" {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	} else {
		db, err = openSQLiteTestDB(t)
	}
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	if err := db.AutoMigrate(testTables...); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	if db.Dialector.Name() == "sqlite" {
		addSQLiteDateTriggers(t, db)
	}
	config.DB = db

	truncate := func() {
		for i := len(testTables) - 1; i >= 0; i-- {
			db.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(testTables[i])
		}
	}
	truncate()
	t.Cleanup(truncate)
}

var sqliteSeq atomic.Int64

// openSQLiteTestDB returns a private in-memory SQLite database so the suite needs no
// external services. The models declare Postgres defaults (gen_random_uuid()); SQLite
// cannot run those, so the defaults are dropped from the cached schemas and a create
// callback fills the UUID primary keys instead.
func openSQLiteTestDB(t *testing.T) (*gorm.DB, error) {
	t.Helper()
	dsn := fmt.Sprintf("file:yptest%d?mode=memory&cache=shared", sqliteSeq.Add(1))
	raw, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	raw.SetMaxOpenConns(1)
	t.Cleanup(func() { raw.Close() })
	db, err := gorm.Open(sqlite.Dialector{Conn: &dateConnPool{raw}}, &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		return nil, err
	}

	for _, m := range testTables {
		stmt := &gorm.Statement{DB: db}
		if err := stmt.Parse(m); err != nil {
			return nil, err
		}
		for _, f := range stmt.Schema.Fields {
			if strings.Contains(f.DefaultValue, "gen_random_uuid") {
				f.DefaultValue = ""
				f.HasDefaultValue = false
				f.DefaultValueInterface = nil
			}
		}
	}
	err = db.Callback().Create().Before("gorm:create").Register("yptest:uuid", func(tx *gorm.DB) {
		if tx.Statement.Schema == nil {
			return
		}
		for _, f := range tx.Statement.Schema.PrimaryFields {
			if f.FieldType != reflect.TypeOf(uuid.UUID{}) {
				continue
			}
			rv := tx.Statement.ReflectValue
			switch rv.Kind() {
			case reflect.Slice, reflect.Array:
				for i := 0; i < rv.Len(); i++ {
					fillUUID(tx, f, rv.Index(i))
				}
			case reflect.Struct:
				fillUUID(tx, f, rv)
			}
		}
	})
	return db, err
}

// dateConnPool rewrites time arguments that sit exactly on midnight into "YYYY-MM-DD"
// strings. Postgres compares a DATE column with such a timestamp by date; SQLite would
// compare text and never match the trimmed value stored by the date triggers.
type dateConnPool struct{ db *sql.DB }

func fixDateArgs(args []interface{}) []interface{} {
	out := make([]interface{}, len(args))
	for i, a := range args {
		if tm, ok := a.(time.Time); ok && tm.Hour() == 0 && tm.Minute() == 0 && tm.Second() == 0 && tm.Nanosecond() == 0 {
			a = tm.Format("2006-01-02")
		}
		out[i] = a
	}
	return out
}

func (p *dateConnPool) PrepareContext(ctx context.Context, q string) (*sql.Stmt, error) {
	return p.db.PrepareContext(ctx, q)
}
func (p *dateConnPool) ExecContext(ctx context.Context, q string, a ...interface{}) (sql.Result, error) {
	return p.db.ExecContext(ctx, q, fixDateArgs(a)...)
}
func (p *dateConnPool) QueryContext(ctx context.Context, q string, a ...interface{}) (*sql.Rows, error) {
	return p.db.QueryContext(ctx, q, fixDateArgs(a)...)
}
func (p *dateConnPool) QueryRowContext(ctx context.Context, q string, a ...interface{}) *sql.Row {
	return p.db.QueryRowContext(ctx, q, fixDateArgs(a)...)
}
func (p *dateConnPool) GetDBConn() (*sql.DB, error) { return p.db, nil }
func (p *dateConnPool) BeginTx(ctx context.Context, opts *sql.TxOptions) (gorm.ConnPool, error) {
	tx, err := p.db.BeginTx(ctx, opts)
	if err != nil {
		return nil, err
	}
	return &dateTx{tx}, nil
}

type dateTx struct{ tx *sql.Tx }

func (p *dateTx) PrepareContext(ctx context.Context, q string) (*sql.Stmt, error) {
	return p.tx.PrepareContext(ctx, q)
}
func (p *dateTx) ExecContext(ctx context.Context, q string, a ...interface{}) (sql.Result, error) {
	return p.tx.ExecContext(ctx, q, fixDateArgs(a)...)
}
func (p *dateTx) QueryContext(ctx context.Context, q string, a ...interface{}) (*sql.Rows, error) {
	return p.tx.QueryContext(ctx, q, fixDateArgs(a)...)
}
func (p *dateTx) QueryRowContext(ctx context.Context, q string, a ...interface{}) *sql.Row {
	return p.tx.QueryRowContext(ctx, q, fixDateArgs(a)...)
}
func (p *dateTx) Commit() error   { return p.tx.Commit() }
func (p *dateTx) Rollback() error { return p.tx.Rollback() }

// addSQLiteDateTriggers makes DATE columns behave like Postgres: SQLite would keep the
// full timestamp the driver writes, so equality checks such as log_date = '2026-01-02'
// never match. A trigger trims the stored text to the date part.
func addSQLiteDateTriggers(t *testing.T, db *gorm.DB) {
	t.Helper()
	for _, m := range testTables {
		stmt := &gorm.Statement{DB: db}
		if err := stmt.Parse(m); err != nil {
			t.Fatal(err)
		}
		for _, f := range stmt.Schema.Fields {
			if !strings.EqualFold(string(f.DataType), "date") {
				continue
			}
			tbl, col := stmt.Schema.Table, f.DBName
			for _, ev := range []string{"INSERT", "UPDATE OF " + col} {
				name := fmt.Sprintf("trim_%s_%s_%s", tbl, col, strings.Fields(ev)[0])
				sql := fmt.Sprintf(`CREATE TRIGGER IF NOT EXISTS %s AFTER %s ON %s
					WHEN length(NEW.%s) > 10
					BEGIN UPDATE %s SET %s = substr(NEW.%s, 1, 10) WHERE rowid = NEW.rowid; END`,
					name, ev, tbl, col, tbl, col, col)
				if err := db.Exec(sql).Error; err != nil {
					t.Fatalf("trigger %s: %v", name, err)
				}
			}
		}
	}
}

func fillUUID(tx *gorm.DB, f *schema.Field, rv reflect.Value) {
	for rv.Kind() == reflect.Ptr {
		rv = rv.Elem()
	}
	if v, zero := f.ValueOf(tx.Statement.Context, rv); zero || v == uuid.Nil {
		_ = f.Set(tx.Statement.Context, rv, uuid.New())
	}
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
	return callWith(t, h, method, body, email, nil)
}

// callWith is call plus path parameters (for routes like /schedules/:id). The handler is
// mounted on a real route so Echo fills the params exactly as it does in production.
func callWith(t *testing.T, h echo.HandlerFunc, method, body, email string, params map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	names := make([]string, 0, len(params))
	for name := range params {
		names = append(names, name)
	}
	sort.Strings(names)

	route, target := "/t", "/t"
	for _, name := range names {
		route += "/:" + name
		target += "/" + url.PathEscape(params[name])
	}

	e := echo.New()
	setEmail := func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if email != "" {
				c.Set("email", email)
			}
			return next(c)
		}
	}
	e.Add(method, route, h, setEmail)

	req := httptest.NewRequest(method, target, strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
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
