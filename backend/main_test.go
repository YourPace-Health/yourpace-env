package main

import (
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/labstack/echo/v4"
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
