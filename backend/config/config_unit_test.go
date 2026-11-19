package config

import (
	"testing"
	"testing/fstest"

	"github.com/alicebob/miniredis/v2"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func memDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:cfg"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() { sqlDB.Close() })
	return db
}

func TestRunMigrationsAppliesEachFileOnceInOrder(t *testing.T) {
	db := memDB(t)
	fsys := fstest.MapFS{
		"m/0002_second.sql": {Data: []byte(`INSERT INTO notes (body) VALUES ('two');`)},
		"m/0001_first.sql":  {Data: []byte(`CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT);`)},
		"m/README.md":       {Data: []byte("ignored")},
	}
	if err := runMigrations(db, fsys, "m"); err != nil {
		t.Fatal(err)
	}
	// running again must not apply anything twice
	if err := runMigrations(db, fsys, "m"); err != nil {
		t.Fatal(err)
	}

	var n int64
	db.Table("notes").Count(&n)
	if n != 1 {
		t.Errorf("notes rows = %d, want 1", n)
	}
	var versions []string
	db.Table(migrationsTable).Order("version").Pluck("version", &versions)
	if len(versions) != 2 || versions[0] != "0001_first.sql" || versions[1] != "0002_second.sql" {
		t.Errorf("recorded versions = %v", versions)
	}
}

func TestRunMigrationsFailingFileIsNotRecorded(t *testing.T) {
	db := memDB(t)
	fsys := fstest.MapFS{
		"m/0001_bad.sql": {Data: []byte(`CREATE TABLE ok (id INTEGER); THIS IS NOT SQL;`)},
	}
	err := runMigrations(db, fsys, "m")
	if err == nil {
		t.Fatal("expected the broken migration to fail")
	}
	var applied int64
	db.Table(migrationsTable).Count(&applied)
	if applied != 0 {
		t.Errorf("a failed migration must not be recorded, %d rows", applied)
	}
}

func TestRunMigrationsMissingDirectory(t *testing.T) {
	db := memDB(t)
	if err := runMigrations(db, fstest.MapFS{}, "nope"); err == nil {
		t.Error("expected an error for a missing migrations directory")
	}
}

func TestConnectDBFailsFastOnABadAddress(t *testing.T) {
	if _, err := connectDB("host=127.0.0.1 port=1 user=x password=x dbname=x sslmode=disable connect_timeout=1"); err == nil {
		t.Error("expected a connection error")
	}
}

func TestInitRedis(t *testing.T) {
	mr := miniredis.RunT(t)
	t.Setenv("REDIS_HOST", mr.Host())
	t.Setenv("REDIS_PORT", mr.Port())
	old := RedisClient
	t.Cleanup(func() { RedisClient = old })

	rdb := InitRedis()
	if rdb == nil || RedisClient != rdb {
		t.Fatal("client not stored")
	}
	if err := rdb.Set(Ctx, "k", "v", 0).Err(); err != nil {
		t.Errorf("client cannot talk to the server: %v", err)
	}
	rdb.Close()

	// unreachable server: a warning, but still a usable (failing) client; defaults apply
	t.Setenv("REDIS_HOST", "")
	t.Setenv("REDIS_PORT", "")
	if InitRedis() == nil {
		t.Error("client should still be returned when Redis is down")
	}
	RedisClient.Close()
}
