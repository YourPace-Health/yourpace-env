package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"youpace/config"
	"youpace/models"
	"youpace/services"

	"github.com/labstack/echo/v4"
)

type GoogleLoginRequest struct {
	AccessToken string `json:"accessToken" validate:"required"`
}

type GoogleUserInfo struct {
	Sub           string `json:"sub"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
}

func GoogleLogin(c echo.Context) error {
	var req GoogleLoginRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if req.AccessToken == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "access token is required"})
	}

	// Verify Google access token by calling Google UserInfo endpoint
	userInfoURL := fmt.Sprintf("https://www.googleapis.com/oauth2/v3/userinfo?access_token=%s", req.AccessToken)
	resp, err := http.Get(userInfoURL)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to contact Google API"})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid Google access token"})
	}

	var googleUser GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&googleUser); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to parse Google user info"})
	}

	if googleUser.Email == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "google user info did not contain email"})
	}

	// Find or create user
	var user models.User
	err = config.DB.Where("email = ?", googleUser.Email).First(&user).Error
	if err != nil {
		// User does not exist, let's create a new user
		username := googleUser.Name
		if username == "" {
			username = strings.Split(googleUser.Email, "@")[0]
		}

		user = models.User{
			Username:     username,
			Email:        googleUser.Email,
			EmailConfirm: true, // Google email is already verified
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := config.DB.Create(&user).Error; err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to register user"})
		}

		// Create default user settings
		userSetting := models.UserSetting{
			UserID: user.UserID,
		}
		config.DB.Create(&userSetting)
	}

	// Generate system tokens
	accessToken, err := services.GenerateAccessToken(user.Email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to generate access token"})
	}

	refreshToken, err := services.GenerateRefreshToken(user.Email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to generate refresh token"})
	}

	user.RefreshToken = refreshToken
	config.DB.Save(&user)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
		"user": map[string]interface{}{
			"userId":   user.UserID,
			"username": user.Username,
			"email":    user.Email,
		},
	})
}
