package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"youpace/middleware"

	"github.com/labstack/echo/v4"
)

func hit(e *echo.Echo, ip string) int {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(echo.HeaderXRealIP, ip)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec.Code
}

func TestRateLimitBlocksAfterBurst(t *testing.T) {
	e := echo.New()
	e.GET("/", func(c echo.Context) error { return c.NoContent(http.StatusOK) }, middleware.RateLimit(3))

	for i := 0; i < 3; i++ {
		if code := hit(e, "1.1.1.1"); code != http.StatusOK {
			t.Fatalf("request %d: want 200, got %d", i+1, code)
		}
	}
	if code := hit(e, "1.1.1.1"); code != http.StatusTooManyRequests {
		t.Fatalf("want 429 after burst, got %d", code)
	}
}

func TestRateLimitIsPerClient(t *testing.T) {
	e := echo.New()
	e.GET("/", func(c echo.Context) error { return c.NoContent(http.StatusOK) }, middleware.RateLimit(1))

	if code := hit(e, "1.1.1.1"); code != http.StatusOK {
		t.Fatalf("first client: want 200, got %d", code)
	}
	if code := hit(e, "2.2.2.2"); code != http.StatusOK {
		t.Fatalf("second client should have its own bucket, got %d", code)
	}
}
