package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"youpace/middleware"
	"youpace/services"

	"github.com/labstack/echo/v4"
)

func TestJWTMiddleware(t *testing.T) {
	e := echo.New()

	handler := middleware.JWTMiddleware(func(c echo.Context) error {
		email := c.Get("email").(string)
		return c.String(http.StatusOK, "welcome "+email)
	})

	// 1. Missing Header
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	_ = handler(c)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 on missing auth header, got %d", rec.Code)
	}

	// 2. Invalid Header Format
	req = httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "InvalidFormat")
	rec = httptest.NewRecorder()
	c = e.NewContext(req, rec)
	_ = handler(c)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 on invalid auth header format, got %d", rec.Code)
	}

	// 3. Invalid Token String
	req = httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer invalid.token.value")
	rec = httptest.NewRecorder()
	c = e.NewContext(req, rec)
	_ = handler(c)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 on invalid token, got %d", rec.Code)
	}

	// 4. Refresh Token Rejected for Resource Access
	refreshTok, _ := services.GenerateRefreshToken("user@yourpace.com")
	req = httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+refreshTok)
	rec = httptest.NewRecorder()
	c = e.NewContext(req, rec)
	_ = handler(c)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 when using refresh token as access token, got %d", rec.Code)
	}

	// 5. Valid Access Token
	accessTok, _ := services.GenerateAccessToken("user@yourpace.com")
	req = httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+accessTok)
	rec = httptest.NewRecorder()
	c = e.NewContext(req, rec)
	_ = handler(c)
	if rec.Code != http.StatusOK {
		t.Errorf("Expected 200 on valid access token, got %d", rec.Code)
	}
}
