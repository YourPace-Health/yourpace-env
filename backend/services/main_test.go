package services_test

import (
	"os"
	"testing"
)

// TestMain provides a throwaway JWT secret so tests do not depend on a
// hardcoded default in production code.
func TestMain(m *testing.M) {
	os.Setenv("JWT_SECRET", "test-only-secret")
	os.Exit(m.Run())
}
