package services

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret []byte

func getJwtSecret() []byte {
	if len(jwtSecret) == 0 {
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "your_default_jwt_secret_key_change_in_production"
		}
		jwtSecret = []byte(secret)
	}
	return jwtSecret
}

type TokenClaims struct {
	Email string `json:"email"`
	Type  string `json:"type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

func GenerateAccessToken(email string) (string, error) {
	claims := TokenClaims{
		Email: email,
		Type:  "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)), // 7 days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJwtSecret())
}

func GenerateRefreshToken(email string) (string, error) {
	claims := TokenClaims{
		Email: email,
		Type:  "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)), // 30 days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJwtSecret())
}

func GenerateMagicToken(email string) (string, error) {
	claims := TokenClaims{
		Email: email,
		Type:  "magic",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)), // 15 minutes
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJwtSecret())
}

func ValidateToken(tokenStr string) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		return getJwtSecret(), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
