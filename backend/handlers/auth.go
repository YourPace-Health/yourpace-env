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
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	// Check if user already exists
	var existingUser models.User
	if err := config.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return c.JSON(http.StatusConflict, map[string]string{"error": "email already exists"})
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
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
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
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
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
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	user.EmailConfirm = true
	if err := config.DB.Save(&user).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update user"})
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
		return c.JSON(http.StatusNotFound, map[string]string{"error": "user not found"})
	}

	err := services.SendOTP(email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to send OTP"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "OTP sent to " + email})
}
