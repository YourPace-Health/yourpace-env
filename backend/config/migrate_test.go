package config

import (
	"os"
	"reflect"
	"testing"
	"testing/fstest"

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

func testDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping database test")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	db.Exec("DROP TABLE IF EXISTS " + migrationsTable + ", mig_probe")
	t.Cleanup(func() { db.Exec("DROP TABLE IF EXISTS " + migrationsTable + ", mig_probe") })
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
	t.Cleanup(func() { db.Exec("DROP INDEX IF EXISTS idx_workout_schedules_user_date") })
	if err := RunMigrations(db); err != nil {
		t.Fatal(err)
	}
}

func TestRunMigrationsConcurrentStartup(t *testing.T) {
	db := testDB(t)
	db.Exec("CREATE TABLE IF NOT EXISTS workout_schedules (user_id uuid, scheduled_date date)")
	t.Cleanup(func() { db.Exec("DROP INDEX IF EXISTS idx_workout_schedules_user_date") })

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
