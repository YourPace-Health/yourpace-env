package middleware

import (
	"net/http"
	"time"

	"golang.org/x/time/rate"

	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
)

// RateLimit caps requests per minute for the routes it wraps. Authenticated
// callers are keyed by email, everyone else by client IP.
func RateLimit(perMinute int) echo.MiddlewareFunc {
	store := echoMiddleware.NewRateLimiterMemoryStoreWithConfig(echoMiddleware.RateLimiterMemoryStoreConfig{
		Rate:      rate.Limit(float64(perMinute) / 60.0),
		Burst:     perMinute,
		ExpiresIn: 5 * time.Minute,
	})
	return echoMiddleware.RateLimiterWithConfig(echoMiddleware.RateLimiterConfig{
		Store: store,
		IdentifierExtractor: func(c echo.Context) (string, error) {
			if email, ok := c.Get("email").(string); ok && email != "" {
				return email, nil
			}
			return c.RealIP(), nil
		},
		ErrorHandler: func(c echo.Context, err error) error {
			return c.JSON(http.StatusForbidden, map[string]string{"error": "rate limiter error"})
		},
		DenyHandler: func(c echo.Context, identifier string, err error) error {
			return c.JSON(http.StatusTooManyRequests, map[string]string{
				"error": "too many requests, please slow down",
			})
		},
	})
}
