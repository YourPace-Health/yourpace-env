package handlers

import (
	"net/http"
	"time"

	"youpace/config"
	"youpace/models"
	"youpace/services"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Username string `json:"username" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
	DOB      string `json:"dob"` // YYYY-MM-DD
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type OTPVerifyRequest struct {
	Email string `json:"email" validate:"required,email"`
	OTP   string `json:"otp" validate:"required"`
}

func Register(c echo.Context) error {
	var req RegisterRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": ErrInvalidRequestBody})
	}

	// Check if user already exists
	var existingUser models.User
	if err := config.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		if existingUser.EmailConfirm {
			return c.JSON(http.StatusConflict, map[string]string{"error": "email already exists"})
		}

		// User exists but has not confirmed email, allow them to re-register
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": ErrFailedToHashPassword})
		}

		var dobTime *time.Time
		if req.DOB != "" {
			t, err := time.Parse("2006-01-02", req.DOB)
			if err == nil {
				dobTime = &t
			}
		}

		existingUser.Username = req.Username
		existingUser.PasswordHash = string(hashedPassword)
		existingUser.DOB = dobTime
		existingUser.UpdatedAt = time.Now()

		if err := config.DB.Save(&existingUser).Error; err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update user"})
		}

		// Send OTP
		go services.SendOTP(existingUser.Email)

		return c.JSON(http.StatusCreated, map[string]interface{}{
			"message": "registration successful, please verify your email with OTP sent to " + existingUser.Email,
			"email":   existingUser.Email,
		})
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to hash password"})
	}

	var dobTime *time.Time
	if req.DOB != "" {
		t, err := time.Parse("2006-01-02", req.DOB)
		if err == nil {
			dobTime = &t
		}
	}

	user := models.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		DOB:          dobTime,
		EmailConfirm: false, // Verify via OTP first
	}

	if err := config.DB.Create(&user).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to create user"})
	}

	// Create default user settings
	userSetting := models.UserSetting{
		UserID: user.UserID,
	}
	config.DB.Create(&userSetting)

	// Send OTP
	go services.SendOTP(user.Email)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message": "registration successful, please verify your email with OTP sent to " + user.Email,
		"email":   user.Email,
	})
}

func Login(c echo.Context) error {
	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": ErrInvalidRequestBody})
	}

	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": ErrInvalidCredentials})
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": ErrInvalidCredentials})
	}

	if !user.EmailConfirm {
		// Automatically resend OTP
		go services.SendOTP(user.Email)
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "email is not confirmed, please verify using OTP. OTP has been resent.",
		})
	}

	// Generate tokens
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

func VerifyOTP(c echo.Context) error {
	var req OTPVerifyRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": ErrInvalidRequestBody})
	}

	verified, err := services.VerifyOTP(req.Email, req.OTP)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	if !verified {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid or expired OTP code"})
	}

	// Update User confirm status
	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": ErrUserNotFound})
	}

	user.EmailConfirm = true
	if err := config.DB.Save(&user).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": ErrFailedToUpdateUser})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "email verification successful"})
}

func RequestOTP(c echo.Context) error {
	email := c.QueryParam("email")
	if email == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "email query param is required"})
	}

	var user models.User
	if err := config.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": ErrUserNotFound})
	}

	err := services.SendOTP(email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to send OTP"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "OTP sent to " + email})
}

type MagicLinkRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type VerifyMagicLinkRequest struct {
	Token string `json:"token" validate:"required"`
}

func RequestMagicLink(c echo.Context) error {
	var req MagicLinkRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": ErrInvalidRequestBody})
	}

	// Check if user exists
	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": ErrUserNotFound})
	}

	// Generate magic token
	token, err := services.GenerateMagicToken(user.Email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to generate magic token"})
	}

	// Send Magic Link
	err = services.SendMagicLink(user.Email, token)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to send magic link"})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "magic link sent to " + user.Email,
	})
}

func VerifyMagicLink(c echo.Context) error {
	var req VerifyMagicLinkRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	claims, err := services.ValidateToken(req.Token)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid or expired magic token"})
	}

	if claims.Type != "magic" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid token type"})
	}

	var user models.User
	if err := config.DB.Where("email = ?", claims.Email).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	// Automatically confirm email if logging in via magic link
	if !user.EmailConfirm {
		user.EmailConfirm = true
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
