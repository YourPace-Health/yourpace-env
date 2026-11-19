package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"youpace/config"
	"youpace/models"

	"github.com/alicebob/miniredis/v2"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
)

// Run every handler test in UTC so SQL DATE() comparisons and "today" computed in Go
// agree, whatever the machine's zone (and whatever the time of day the suite runs).
func TestMain(m *testing.M) {
	time.Local = time.UTC
	os.Exit(m.Run())
}

// useMiniRedis points config.RedisClient at an in-memory Redis for the test.
func useMiniRedis(t *testing.T) *miniredis.Miniredis {
	t.Helper()
	mr := miniredis.RunT(t)
	old := config.RedisClient
	config.RedisClient = redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { config.RedisClient.Close(); config.RedisClient = old })
	return mr
}

// fakeAI stands in for the Gemini API: every call is answered with reply as the model's
// text. Replies shaped like {"output":"..."} / {"chatResponse":"..."} are unwrapped.
func fakeAI(t *testing.T, reply string) {
	t.Helper()
	text := reply
	var m map[string]interface{}
	if json.Unmarshal([]byte(reply), &m) == nil {
		for _, k := range []string{"chatResponse", "output"} {
			if v, ok := m[k].(string); ok && v != "" {
				text = v
				break
			}
		}
	}
	body, _ := json.Marshal(map[string]interface{}{
		"candidates": []interface{}{map[string]interface{}{
			"content": map[string]interface{}{"parts": []interface{}{map[string]string{"text": text}}},
		}},
	})
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write(body)
	}))
	t.Cleanup(srv.Close)
	t.Setenv("GEMINI_URL", srv.URL)
	t.Setenv("GEMINI_API_KEY", "test-key")
}

// aiDown makes the AI backend unavailable (no API key configured).
func aiDown(t *testing.T) {
	t.Helper()
	t.Setenv("GEMINI_API_KEY", "")
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// fakeGoogle replaces the default HTTP transport so calls to Google's APIs are answered
// by h in-process. A nil h simulates the network being down.
func fakeGoogle(t *testing.T, h http.HandlerFunc) {
	t.Helper()
	old := http.DefaultTransport
	http.DefaultTransport = roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if h == nil {
			return nil, http.ErrHandlerTimeout
		}
		rec := httptest.NewRecorder()
		h(rec, r)
		return rec.Result(), nil
	})
	t.Cleanup(func() { http.DefaultTransport = old })
}

// eventually polls cond for a couple of seconds; handlers start background goroutines.
func eventually(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s", what)
}

// breakDB closes the database so the next query fails, to exercise error branches.
func breakDB(t *testing.T) {
	t.Helper()
	sqlDB, err := config.DB.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.Close()
}

// userByEmail loads a user row.
func userByEmail(t *testing.T, email string) models.User {
	t.Helper()
	var u models.User
	if err := config.DB.Where("email = ?", email).First(&u).Error; err != nil {
		t.Fatal(err)
	}
	return u
}

func countRows(model interface{}, where string, args ...interface{}) int64 {
	var n int64
	config.DB.Model(model).Where(where, args...).Count(&n)
	return n
}

// callQuery runs a handler on GET /t?<query>. email, when given, is the authenticated user.
func callQuery(t *testing.T, h echo.HandlerFunc, query string, email ...string) *httptest.ResponseRecorder {
	t.Helper()
	e := echo.New()
	e.GET("/t", h, func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if len(email) > 0 {
				c.Set("email", email[0])
			}
			return next(c)
		}
	})
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/t?"+query, nil))
	return rec
}
