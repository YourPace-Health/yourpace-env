package services

import (
	"context"
	"crypto/rand"
	"fmt"
	"io"
	"log"
	"net/smtp"
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

	mailEnabled := os.Getenv("MAIL_ENABLED") == "true" || os.Getenv("MAIL_ENABLED") == ""
	if !mailEnabled {
		log.Printf("[MOCK MAIL] Sent OTP %s to email: %s", otp, email)
		return nil
	}

	// Simple SMTP Email Sender (Gmail)
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"
	
	// Default credentials matching java application.properties
	username := os.Getenv("MAIL_USERNAME")
	if username == "" {
		username = "cp25ms2.financecare@gmail.com"
	}
	password := os.Getenv("MAIL_PASSWORD")
	if password == "" {
		password = "srbpwovznhlktcqt"
	}

	auth := smtp.PlainAuth("", username, password, smtpHost)

	// Compose message
	subject := "Subject: your verification Code\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf("<html><body><h3>Your OTP code is: %s</h3><p>Valid for 5 minutes</p></body></html>", otp)
	msg := []byte(subject + mime + body)

	// In Go, dial SMTP
	go func() {
		err := smtp.SendMail(smtpHost+":"+smtpPort, auth, username, []string{email}, msg)
		if err != nil {
			log.Printf("Error sending email: %v", err)
		} else {
			log.Printf("OTP email successfully sent to %s", email)
		}
	}()

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

	mailEnabled := os.Getenv("MAIL_ENABLED") == "true" || os.Getenv("MAIL_ENABLED") == ""
	if !mailEnabled {
		log.Printf("[MOCK MAIL] Sent Magic Link to email: %s. Link: %s", email, link)
		return nil
	}

	// Simple SMTP Email Sender (Gmail)
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	username := os.Getenv("MAIL_USERNAME")
	if username == "" {
		username = "cp25ms2.financecare@gmail.com"
	}
	password := os.Getenv("MAIL_PASSWORD")
	if password == "" {
		password = "srbpwovznhlktcqt"
	}

	auth := smtp.PlainAuth("", username, password, smtpHost)

	// Compose message
	subject := "Subject: your magic Login Link\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf("<html><body><h3>Click the link below to login to yourPace:</h3><p><a href=\"%s\">Login to yourPace</a></p><p>This link is valid for 15 minutes.</p></body></html>", link)
	msg := []byte(subject + mime + body)

	go func() {
		err := smtp.SendMail(smtpHost+":"+smtpPort, auth, username, []string{email}, msg)
		if err != nil {
			log.Printf("Error sending magic link email: %v", err)
		} else {
			log.Printf("Magic link email successfully sent to %s", email)
		}
	}()

	return nil
}
