package services_test

import (
	"os"
	"testing"
	"time"
	"youpace/services"

	"github.com/golang-jwt/jwt/v5"
)

func TestJWTTokenGenerationAndValidation(t *testing.T) {
	os.Setenv("JWT_SECRET", "custom-secret-key-12345678901234567890")
	defer os.Unsetenv("JWT_SECRET")

	email := "testuser@yourpace.com"

	// 1. Access Token
	accessToken, err := services.GenerateAccessToken(email)
	if err != nil {
		t.Fatalf("Failed to generate access token: %v", err)
	}
	if accessToken == "" {
		t.Fatal("Access token should not be empty")
	}

	claims, err := services.ValidateToken(accessToken)
	if err != nil {
		t.Fatalf("Failed to validate access token: %v", err)
	}
	if claims.Email != email {
		t.Errorf("Expected email %s, got %s", email, claims.Email)
	}
	if claims.Type != "access" {
		t.Errorf("Expected token type 'access', got %s", claims.Type)
	}

	// 2. Refresh Token
	refreshToken, err := services.GenerateRefreshToken(email)
	if err != nil {
		t.Fatalf("Failed to generate refresh token: %v", err)
	}
	claimsRefresh, err := services.ValidateToken(refreshToken)
	if err != nil {
		t.Fatalf("Failed to validate refresh token: %v", err)
	}
	if claimsRefresh.Type != "refresh" {
		t.Errorf("Expected token type 'refresh', got %s", claimsRefresh.Type)
	}

	// 3. Magic Token
	magicToken, err := services.GenerateMagicToken(email)
	if err != nil {
		t.Fatalf("Failed to generate magic token: %v", err)
	}
	claimsMagic, err := services.ValidateToken(magicToken)
	if err != nil {
		t.Fatalf("Failed to validate magic token: %v", err)
	}
	if claimsMagic.Type != "magic" {
		t.Errorf("Expected token type 'magic', got %s", claimsMagic.Type)
	}

	// 4. Invalid Token String
	_, errInvalid := services.ValidateToken("invalid.token.signature")
	if errInvalid == nil {
		t.Errorf("Expected error on invalid token string")
	}

	// 5. Expired Token
	expiredClaims := services.TokenClaims{
		Email: email,
		Type:  "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
	}
	expiredToken := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
	tokenStr, _ := expiredToken.SignedString([]byte("custom-secret-key-12345678901234567890"))
	_, errExpired := services.ValidateToken(tokenStr)
	if errExpired == nil {
		t.Errorf("Expected error on expired token")
	}
}
