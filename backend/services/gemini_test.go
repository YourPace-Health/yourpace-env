package services

import (
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func init() { retryBaseDelay = time.Millisecond }

func geminiOK() string {
	return `{"candidates":[{"content":{"parts":[{"text":"hello"}]}}]}`
}

func TestPostJSONWithRetryRecoversFromServerError(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if atomic.AddInt32(&calls, 1) < 3 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.Write([]byte(geminiOK()))
	}))
	defer srv.Close()

	status, body, err := postJSONWithRetry(srv.Client(), srv.URL, []byte(`{}`), 3)
	if err != nil || status != http.StatusOK || len(body) == 0 {
		t.Fatalf("status=%d err=%v body=%q", status, err, body)
	}
	if calls != 3 {
		t.Errorf("calls = %d, want 3", calls)
	}
}

func TestPostJSONWithRetryDoesNotRetryClientErrors(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer srv.Close()

	status, _, err := postJSONWithRetry(srv.Client(), srv.URL, []byte(`{}`), 3)
	if err != nil || status != http.StatusBadRequest {
		t.Fatalf("status=%d err=%v", status, err)
	}
	if calls != 1 {
		t.Errorf("calls = %d, want 1", calls)
	}
}

func TestPostJSONWithRetryGivesUp(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	status, _, _ := postJSONWithRetry(srv.Client(), srv.URL, []byte(`{}`), 2)
	if status != http.StatusTooManyRequests || calls != 2 {
		t.Fatalf("status=%d calls=%d", status, calls)
	}
}

func TestCallGeminiVision(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("key") != "k" {
			t.Errorf("api key missing from query")
		}
		w.Write([]byte(geminiOK()))
	}))
	defer srv.Close()
	t.Setenv("GEMINI_API_KEY", "k")
	t.Setenv("GEMINI_URL", srv.URL)

	got, err := CallGeminiVision("p", "image/png", "AAAA")
	if err != nil || got != "hello" {
		t.Fatalf("got %q err=%v", got, err)
	}
}

func TestCallGeminiVisionErrors(t *testing.T) {
	empty := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"candidates":[]}`))
	}))
	defer empty.Close()
	t.Setenv("GEMINI_URL", empty.URL)
	if _, err := CallGeminiVision("p", "image/png", "AAAA"); err == nil {
		t.Error("want error for empty candidates")
	}

	bad := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer bad.Close()
	t.Setenv("GEMINI_URL", bad.URL)
	if _, err := CallGeminiVision("p", "image/png", "AAAA"); err == nil {
		t.Error("want error for 400")
	}
}

func TestCallN8N(t *testing.T) {
	cases := []struct {
		name, body string
		wantErr    bool
		want       string
	}{
		{"plain text", "  hi there ", false, "hi there"},
		{"empty", "", true, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Write([]byte(tc.body))
			}))
			defer srv.Close()
			got, err := callN8N("p", srv.URL)
			if (err != nil) != tc.wantErr || got != tc.want {
				t.Fatalf("got %q err=%v", got, err)
			}
		})
	}
}

func TestCallN8NRejectsUnparsedTemplate(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("{{ $json.output }}"))
	}))
	defer srv.Close()
	if _, err := callN8N("p", srv.URL); err == nil {
		t.Error("want error for unparsed template")
	}
}

func TestCallN8NNon200(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()
	if _, err := callN8N("p", srv.URL); err == nil {
		t.Error("want error for 500")
	}
}
