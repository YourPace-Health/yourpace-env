package config

import (
	"fmt"
	"os"
	"reflect"
	"regexp"
	"testing"
	"testing/fstest"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestPendingMigrations(t *testing.T) {
	all := []string{"0002_b.sql", "0001_a.sql", "README.md", "0003_c.sql"}
	got := pendingMigrations(all, map[string]bool{"0001_a.sql": true})
	want := []string{"0002_b.sql", "0003_c.sql"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
	if got := pendingMigrations(all, map[string]bool{"0001_a.sql": true, "0002_b.sql": true, "0003_c.sql": true}); len(got) != 0 {
		t.Errorf("nothing should be pending, got %v", got)
	}
}

// testDB returns a connection to a brand-new, empty database that is dropped when the test
// ends. These tests create and drop tables (including a stand-in workout_schedules), and the
// handler tests share the main test database and run in parallel with this package, so they
// must not touch it. TEST_DATABASE_URL must use the key=value form (host=... dbname=...).
func testDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping database test")
	}
	nameRe := regexp.MustCompile(`dbname=\S+`)
	if !nameRe.MatchString(dsn) {
		t.Skip("TEST_DATABASE_URL must contain dbname=... (key=value form) for isolated config tests")
	}

	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	name := fmt.Sprintf("yp_cfg_%d", time.Now().UnixNano())
	if err := admin.Exec("CREATE DATABASE " + name).Error; err != nil {
		t.Fatalf("create scratch database: %v", err)
	}

	db, err := gorm.Open(postgres.Open(nameRe.ReplaceAllString(dsn, "dbname="+name)), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
		admin.Exec("DROP DATABASE IF EXISTS " + name + " WITH (FORCE)")
		if sqlDB, err := admin.DB(); err == nil {
			sqlDB.Close()
		}
	})
	return db
}

func TestRunMigrationsAppliesOnceInOrder(t *testing.T) {
	db := testDB(t)
	fsys := fstest.MapFS{
		"m/0001_create.sql": {Data: []byte("CREATE TABLE mig_probe (id int);")},
		"m/0002_insert.sql": {Data: []byte("INSERT INTO mig_probe VALUES (1);")},
	}

	if err := runMigrations(db, fsys, "m"); err != nil {
		t.Fatal(err)
	}
	// running again must not re-apply (the CREATE TABLE would fail)
	if err := runMigrations(db, fsys, "m"); err != nil {
		t.Fatalf("second run should be a no-op: %v", err)
	}

	var rows, versions int64
	db.Table("mig_probe").Count(&rows)
	db.Table(migrationsTable).Count(&versions)
	if rows != 1 || versions != 2 {
		t.Errorf("rows=%d versions=%d, want 1 and 2", rows, versions)
	}
}

func TestRunMigrationsRollsBackAFailingFile(t *testing.T) {
	db := testDB(t)
	fsys := fstest.MapFS{
		"m/0001_bad.sql": {Data: []byte("CREATE TABLE mig_probe (id int); SELECT * FROM does_not_exist;")},
	}
	if err := runMigrations(db, fsys, "m"); err == nil {
		t.Fatal("expected an error")
	}
	if db.Migrator().HasTable("mig_probe") {
		t.Error("failed migration must roll back its changes")
	}
	var versions int64
	db.Table(migrationsTable).Count(&versions)
	if versions != 0 {
		t.Errorf("failed migration must not be recorded, got %d", versions)
	}
}

func TestEmbeddedMigrationsApply(t *testing.T) {
	db := testDB(t)
	db.Exec("CREATE TABLE IF NOT EXISTS workout_schedules (user_id uuid, scheduled_date date)")
	if err := RunMigrations(db); err != nil {
		t.Fatal(err)
	}
}

func TestRunMigrationsConcurrentStartup(t *testing.T) {
	db := testDB(t)
	db.Exec("CREATE TABLE IF NOT EXISTS workout_schedules (user_id uuid, scheduled_date date)")

	// several instances booting at once must not collide creating schema_migrations
	const n = 6
	errs := make(chan error, n)
	for i := 0; i < n; i++ {
		go func() { errs <- RunMigrations(db) }()
	}
	for i := 0; i < n; i++ {
		if err := <-errs; err != nil {
			t.Errorf("concurrent RunMigrations: %v", err)
		}
	}
}
