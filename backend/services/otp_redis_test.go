package services

import (
	"testing"

	"youpace/config"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func useMiniRedis(t *testing.T) *miniredis.Miniredis {
	t.Helper()
	mr := miniredis.RunT(t)
	old := config.RedisClient
	config.RedisClient = redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { config.RedisClient.Close(); config.RedisClient = old })
	return mr
}

func TestOTPRoundTripThroughRedis(t *testing.T) {
	mr := useMiniRedis(t)
	t.Setenv("MAIL_ENABLED", "false")

	if err := SendOTP("a@example.com"); err != nil {
		t.Fatal(err)
	}
	code, err := mr.Get("otp:a@example.com")
	if err != nil || len(code) != 6 {
		t.Fatalf("stored code = %q, %v", code, err)
	}
	if ok, _ := VerifyOTP("a@example.com", "000000x"); ok {
		t.Error("wrong code accepted")
	}
	if ok, err := VerifyOTP("a@example.com", code); !ok || err != nil {
		t.Fatalf("right code rejected: %v %v", ok, err)
	}
	if ok, _ := VerifyOTP("a@example.com", code); ok {
		t.Error("a code must work only once")
	}
	if ok, _ := VerifyOTP("nobody@example.com", "123456"); ok {
		t.Error("unknown email accepted")
	}
}

func TestSendOTPFailsWhenRedisIsDown(t *testing.T) {
	mr := useMiniRedis(t)
	mr.Close()
	if err := SendOTP("a@example.com"); err == nil {
		t.Error("expected the Redis error to be returned")
	}
}
