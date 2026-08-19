package middleware

import (
	"net/http"
	"strings"

	"youpace/services"

	"github.com/labstack/echo/v4"
)

func JWTMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "missing authorization header",
			})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "invalid authorization header format",
			})
		}

		tokenStr := parts[1]
		claims, err := services.ValidateToken(tokenStr)
		if err != nil {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "invalid or expired token",
			})
		}

		if claims.Type == "refresh" {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "refresh tokens cannot be used to access API resources",
			})
		}

		// Store email in context
		c.Set("email", claims.Email)
		return next(c)
	}
}
