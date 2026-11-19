package config

import "testing"

func TestBuildDSNFromParts(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	t.Setenv("DB_HOST", "db")
	t.Setenv("DB_PORT", "5432")
	t.Setenv("DB_USER", "root")
	t.Setenv("DB_PASSWORD", "pw")
	t.Setenv("DB_NAME", "yp")
	t.Setenv("DB_SSLMODE", "")

	want := "host=db user=root password=pw dbname=yp port=5432 sslmode=disable TimeZone=Asia/Bangkok"
	if got := BuildDSN(); got != want {
		t.Errorf("got  %q\nwant %q", got, want)
	}

	t.Setenv("DB_SSLMODE", "require")
	if got := BuildDSN(); got != "host=db user=root password=pw dbname=yp port=5432 sslmode=require TimeZone=Asia/Bangkok" {
		t.Errorf("sslmode not applied: %q", got)
	}
}

func TestBuildDSNPrefersDatabaseURL(t *testing.T) {
	t.Setenv("DB_HOST", "ignored")

	t.Setenv("DATABASE_URL", "postgres://u:p@host.neon.tech/yp?sslmode=require")
	if got, want := BuildDSN(), "postgres://u:p@host.neon.tech/yp?sslmode=require&TimeZone=Asia/Bangkok"; got != want {
		t.Errorf("got %q, want %q", got, want)
	}

	t.Setenv("DATABASE_URL", "postgres://u:p@host/yp")
	if got, want := BuildDSN(), "postgres://u:p@host/yp?TimeZone=Asia/Bangkok"; got != want {
		t.Errorf("got %q, want %q", got, want)
	}

	t.Setenv("DATABASE_URL", "  postgres://u:p@host/yp?TimeZone=UTC  ")
	if got, want := BuildDSN(), "postgres://u:p@host/yp?TimeZone=UTC"; got != want {
		t.Errorf("an explicit TimeZone must be kept: got %q, want %q", got, want)
	}
}
