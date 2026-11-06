package services

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"regexp"
	"sync/atomic"
	"testing"
)

type captured struct {
	path    string
	headers http.Header
	body    map[string]interface{}
}

// mailServer records the last request and answers with the given status codes in order
// (the last status repeats).
func mailServer(t *testing.T, statuses ...int) (*httptest.Server, *captured, *int32) {
	t.Helper()
	got := &captured{}
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := int(atomic.AddInt32(&calls, 1))
		b, _ := io.ReadAll(r.Body)
		got.path = r.URL.Path
		got.headers = r.Header.Clone()
		got.body = map[string]interface{}{}
		_ = json.Unmarshal(b, &got.body)
		status := statuses[len(statuses)-1]
		if n <= len(statuses) {
			status = statuses[n-1]
		}
		w.WriteHeader(status)
		w.Write([]byte(`{"message":"detail"}`))
	}))
	t.Cleanup(srv.Close)
	t.Setenv("MAIL_API_BASE_URL", srv.URL)
	return srv, got, &calls
}

func useProvider(t *testing.T, provider string) {
	t.Helper()
	t.Setenv("MAIL_ENABLED", "true")
	t.Setenv("MAIL_PROVIDER", provider)
	t.Setenv("MAIL_FROM", "noreply@yourpace.test")
	t.Setenv("MAIL_FROM_NAME", "yourPace")
}

func TestMailEnabledSemantics(t *testing.T) {
	cases := []struct {
		value                 string
		enabled, explicitOnly bool
	}{
		{"true", true, true},
		{"", true, false}, // legacy default: unset behaves as enabled for sign-in mails
		{"false", false, false},
		{"nonsense", false, false},
	}
	for _, tc := range cases {
		t.Setenv("MAIL_ENABLED", tc.value)
		if MailEnabled() != tc.enabled || MailExplicitlyEnabled() != tc.explicitOnly {
			t.Errorf("MAIL_ENABLED=%q: enabled=%v explicit=%v, want %v and %v",
				tc.value, MailEnabled(), MailExplicitlyEnabled(), tc.enabled, tc.explicitOnly)
		}
	}
}

func TestSendMailMockModeSendsNothing(t *testing.T) {
	_, _, calls := mailServer(t, 200)
	useProvider(t, "brevo")
	t.Setenv("MAIL_ENABLED", "false")
	t.Setenv("BREVO_API_KEY", "k")
	if err := SendMail(Mail{To: "a@example.com", Subject: "s", HTML: "<p>x</p>"}); err != nil {
		t.Fatal(err)
	}
	if *calls != 0 {
		t.Errorf("mock mode made %d requests", *calls)
	}
}

func TestSendMailBrevo(t *testing.T) {
	_, got, _ := mailServer(t, 201)
	useProvider(t, "brevo")
	t.Setenv("BREVO_API_KEY", "secret-key")

	if err := SendMail(Mail{To: "user@example.com", Subject: "Hello", HTML: "<p>hi</p>"}); err != nil {
		t.Fatal(err)
	}
	if got.path != "/v3/smtp/email" || got.headers.Get("api-key") != "secret-key" {
		t.Errorf("path=%q api-key=%q", got.path, got.headers.Get("api-key"))
	}
	sender := got.body["sender"].(map[string]interface{})
	to := got.body["to"].([]interface{})[0].(map[string]interface{})
	if sender["email"] != "noreply@yourpace.test" || to["email"] != "user@example.com" ||
		got.body["subject"] != "Hello" || got.body["htmlContent"] != "<p>hi</p>" {
		t.Errorf("payload = %+v", got.body)
	}
}

func TestSendMailResend(t *testing.T) {
	_, got, _ := mailServer(t, 200)
	useProvider(t, "resend")
	t.Setenv("RESEND_API_KEY", "re_key")

	if err := SendMail(Mail{To: "user@example.com", Subject: "Hello", HTML: "<p>hi</p>"}); err != nil {
		t.Fatal(err)
	}
	if got.path != "/emails" || got.headers.Get("Authorization") != "Bearer re_key" {
		t.Errorf("path=%q auth=%q", got.path, got.headers.Get("Authorization"))
	}
	if got.body["from"] != "yourPace <noreply@yourpace.test>" || got.body["html"] != "<p>hi</p>" {
		t.Errorf("payload = %+v", got.body)
	}
}

func TestSendMailReportsProviderRejection(t *testing.T) {
	mailServer(t, 400)
	useProvider(t, "brevo")
	t.Setenv("BREVO_API_KEY", "k")
	err := SendMail(Mail{To: "a@example.com", Subject: "s", HTML: "x"})
	if err == nil || !regexp.MustCompile(`status 400`).MatchString(err.Error()) {
		t.Errorf("want a status 400 error, got %v", err)
	}
}

func TestSendMailRetriesTransientFailures(t *testing.T) {
	_, _, calls := mailServer(t, 503, 503, 201)
	useProvider(t, "brevo")
	t.Setenv("BREVO_API_KEY", "k")
	if err := SendMail(Mail{To: "a@example.com", Subject: "s", HTML: "x"}); err != nil {
		t.Fatalf("should succeed on the third attempt: %v", err)
	}
	if *calls != 3 {
		t.Errorf("calls = %d, want 3", *calls)
	}
}

func TestSendMailConfigurationErrors(t *testing.T) {
	useProvider(t, "brevo")
	t.Setenv("BREVO_API_KEY", "")
	if err := SendMail(Mail{To: "a@example.com"}); err == nil {
		t.Error("missing BREVO_API_KEY must be an error")
	}

	t.Setenv("BREVO_API_KEY", "k")
	t.Setenv("MAIL_FROM", "")
	if err := SendMail(Mail{To: "a@example.com"}); err == nil {
		t.Error("missing MAIL_FROM must be an error")
	}

	useProvider(t, "resend")
	t.Setenv("RESEND_API_KEY", "")
	if err := SendMail(Mail{To: "a@example.com"}); err == nil {
		t.Error("missing RESEND_API_KEY must be an error")
	}

	useProvider(t, "carrier-pigeon")
	if err := SendMail(Mail{To: "a@example.com"}); err == nil {
		t.Error("unknown provider must be an error")
	}

	useProvider(t, "smtp")
	t.Setenv("MAIL_USERNAME", "")
	t.Setenv("MAIL_PASSWORD", "")
	if err := SendMail(Mail{To: "a@example.com"}); err == nil {
		t.Error("smtp without credentials must be an error")
	}
}

func TestSendOTPEmailsTheCodeThroughTheProvider(t *testing.T) {
	_, got, _ := mailServer(t, 201)
	useProvider(t, "brevo")
	t.Setenv("BREVO_API_KEY", "k")

	if err := SendOTP("new.user@example.com"); err != nil {
		t.Fatal(err)
	}
	html, _ := got.body["htmlContent"].(string)
	if !regexp.MustCompile(`OTP code is: \d{6}`).MatchString(html) {
		t.Errorf("email should contain a 6-digit code, got %q", html)
	}
	to := got.body["to"].([]interface{})[0].(map[string]interface{})
	if to["email"] != "new.user@example.com" {
		t.Errorf("recipient = %v", to["email"])
	}
}

func TestSendOTPReturnsTheProviderError(t *testing.T) {
	mailServer(t, 401)
	useProvider(t, "brevo")
	t.Setenv("BREVO_API_KEY", "bad")
	if err := SendOTP("x@example.com"); err == nil {
		t.Error("a rejected OTP email must surface as an error")
	}
}

func TestSendMagicLinkEmailsTheLink(t *testing.T) {
	_, got, _ := mailServer(t, 201)
	useProvider(t, "resend")
	t.Setenv("RESEND_API_KEY", "k")
	t.Setenv("FRONTEND_URL", "https://app.example.com")

	if err := SendMagicLink("m@example.com", "tok123"); err != nil {
		t.Fatal(err)
	}
	html, _ := got.body["html"].(string)
	if !regexp.MustCompile(`https://app\.example\.com/\?magic-token=tok123`).MatchString(html) {
		t.Errorf("link missing from %q", html)
	}
}

func TestWorkoutReminderUsesTheProviderOnlyWhenExplicitlyEnabled(t *testing.T) {
	_, got, calls := mailServer(t, 201)
	useProvider(t, "brevo")
	t.Setenv("BREVO_API_KEY", "k")

	if err := SendWorkoutReminder("r@example.com", "Leg day", 30); err != nil {
		t.Fatal(err)
	}
	if *calls != 1 || got.body["subject"] != "Today's workout: Leg day" {
		t.Errorf("calls=%d body=%+v", *calls, got.body)
	}

	t.Setenv("MAIL_ENABLED", "")
	before := *calls
	if err := SendWorkoutReminder("r@example.com", "Leg day", 30); err != nil || *calls != before {
		t.Errorf("unset MAIL_ENABLED must not send reminders (err=%v, calls %d -> %d)", err, before, *calls)
	}
}
