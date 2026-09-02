package services_test

import (
	"os"
	"testing"
	"youpace/services"
)

func TestGenerateOTP(t *testing.T) {
	otp1 := services.GenerateOTP()
	if len(otp1) != 6 {
		t.Errorf("Expected 6-digit OTP, got %s (length %d)", otp1, len(otp1))
	}

	for _, c := range otp1 {
		if c < '0' || c > '9' {
			t.Errorf("OTP must contain only digits 0-9, got %s", otp1)
		}
	}

	otp2 := services.GenerateOTP()
	if len(otp2) != 6 {
		t.Errorf("Expected 6-digit OTP, got %s", otp2)
	}
}

func TestVerifyOTPWithoutRedis(t *testing.T) {
	// Without Redis initialized, should return error
	ok, err := services.VerifyOTP("test@example.com", "123456")
	if ok {
		t.Errorf("Expected false verification without Redis")
	}
	if err == nil {
		t.Errorf("Expected error when Redis is not initialized")
	}
}

func TestSendOTPMock(t *testing.T) {
	os.Setenv("MAIL_ENABLED", "false")
	defer os.Unsetenv("MAIL_ENABLED")

	err := services.SendOTP("testuser@example.com")
	if err != nil {
		t.Errorf("SendOTP failed in mock mode: %v", err)
	}
}

func TestSendMagicLinkMock(t *testing.T) {
	os.Setenv("MAIL_ENABLED", "false")
	defer os.Unsetenv("MAIL_ENABLED")

	err := services.SendMagicLink("testuser@example.com", "mock-token-123456")
	if err != nil {
		t.Errorf("SendMagicLink failed in mock mode: %v", err)
	}
}
