package services

import (
	"context"
	"crypto/rand"
	"fmt"
	"io"
	"log"
	"os"
	"time"

	"youpace/config"
)

var ctx = context.Background()

func GenerateOTP() string {
	var table = [...]byte{'1', '2', '3', '4', '5', '6', '7', '8', '9', '0'}
	b := make([]byte, 6)
	n, err := io.ReadAtLeast(rand.Reader, b, 6)
	if n != 6 || err != nil {
		return "123456" // Fallback
	}
	for i := 0; i < len(b); i++ {
		b[i] = table[int(b[i])%len(table)]
	}
	return string(b)
}

func SendOTP(email string) error {
	otp := GenerateOTP()
	
	// Save to Redis (valid for 5 minutes)
	if config.RedisClient != nil {
		err := config.RedisClient.Set(ctx, "otp:"+email, otp, 5*time.Minute).Err()
		if err != nil {
			log.Printf("Error saving OTP to Redis: %v", err)
			return err
		}
	} else {
		log.Println("Warning: RedisClient is nil, OTP cannot be saved to Redis")
	}

	err := SendMail(Mail{
		To:      email,
		Subject: "Your verification code",
		HTML:    fmt.Sprintf("<html><body><h3>Your OTP code is: %s</h3><p>Valid for 5 minutes</p></body></html>", otp),
		LogHint: "OTP " + otp,
	})
	if err != nil {
		log.Printf("Error sending OTP email to %s: %v", email, err)
		return err
	}
	return nil
}

func VerifyOTP(email string, otp string) (bool, error) {
	if config.RedisClient == nil {
		return false, fmt.Errorf("redis client is not initialized")
	}

	storedOtp, err := config.RedisClient.Get(ctx, "otp:"+email).Result()
	if err != nil {
		return false, nil // Expired or not found
	}

	if storedOtp != otp {
		return false, nil // Wrong OTP
	}

	// Delete OTP after verification
	config.RedisClient.Del(ctx, "otp:"+email)
	return true, nil
}

func SendMagicLink(email string, token string) error {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	link := fmt.Sprintf("%s/?magic-token=%s", frontendURL, token)

	err := SendMail(Mail{
		To:      email,
		Subject: "Your magic login link",
		HTML:    fmt.Sprintf("<html><body><h3>Click the link below to login to yourPace:</h3><p><a href=\"%s\">Login to yourPace</a></p><p>This link is valid for 15 minutes.</p></body></html>", link),
		LogHint: "link " + link,
	})
	if err != nil {
		log.Printf("Error sending magic link email to %s: %v", email, err)
	}
	return err
}
