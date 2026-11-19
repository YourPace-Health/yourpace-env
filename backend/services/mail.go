package services

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"strings"
	"time"
)

// Mail is one outgoing HTML email.
type Mail struct {
	To      string
	Subject string
	HTML    string
	// LogHint is printed in mock mode instead of the full body (e.g. the OTP or link),
	// so local development can still complete a sign-up without a mail provider.
	LogHint string
}

// MailEnabled reports whether mail should really be sent. Unset keeps the legacy
// behaviour (enabled); MAIL_ENABLED=false switches to logging only.
func MailEnabled() bool {
	v := os.Getenv("MAIL_ENABLED")
	return v == "true" || v == ""
}

// MailExplicitlyEnabled is true only for MAIL_ENABLED=true. Background mail such as
// workout reminders uses it so nothing is sent by accident.
func MailExplicitlyEnabled() bool {
	return os.Getenv("MAIL_ENABLED") == "true"
}

// mailProvider is chosen by MAIL_PROVIDER: "brevo" or "resend" (HTTPS APIs) or "smtp"
// (default, Gmail). Hosts such as Render's free plan block outbound SMTP ports, so use an
// HTTPS provider there.
func mailProvider() string {
	p := strings.ToLower(strings.TrimSpace(os.Getenv("MAIL_PROVIDER")))
	if p == "" {
		return "smtp"
	}
	return p
}

var mailHTTPClient = &http.Client{Timeout: 15 * time.Second}

// SendMail sends m with the configured provider, or logs it in mock mode.
func SendMail(m Mail) error {
	if !MailEnabled() {
		log.Printf("[MOCK MAIL] to %s: %s %s", m.To, m.Subject, m.LogHint)
		return nil
	}
	switch mailProvider() {
	case "brevo":
		return sendBrevo(m)
	case "resend":
		return sendResend(m)
	case "smtp":
		return sendSMTP(m)
	default:
		return fmt.Errorf("unknown MAIL_PROVIDER %q (use brevo, resend or smtp)", mailProvider())
	}
}

func mailFrom() (addr, name string, err error) {
	addr = strings.TrimSpace(os.Getenv("MAIL_FROM"))
	if addr == "" {
		return "", "", fmt.Errorf("MAIL_FROM must be set (a sender address verified with your mail provider)")
	}
	name = strings.TrimSpace(os.Getenv("MAIL_FROM_NAME"))
	if name == "" {
		name = "yourPace"
	}
	return addr, name, nil
}

// apiBase lets tests point a provider at a local server; production uses the default.
func apiBase(def string) string {
	if v := strings.TrimRight(strings.TrimSpace(os.Getenv("MAIL_API_BASE_URL")), "/"); v != "" {
		return v
	}
	return def
}

func postMailJSON(url string, headers map[string]string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	status, resp, err := postJSONWithHeaders(mailHTTPClient, url, headers, body, 3)
	if err != nil {
		return err
	}
	if status < 200 || status >= 300 {
		return fmt.Errorf("mail provider returned status %d: %s", status, strings.TrimSpace(string(resp)))
	}
	return nil
}

func sendBrevo(m Mail) error {
	key := strings.TrimSpace(os.Getenv("BREVO_API_KEY"))
	if key == "" {
		return fmt.Errorf("BREVO_API_KEY must be set when MAIL_PROVIDER=brevo")
	}
	from, name, err := mailFrom()
	if err != nil {
		return err
	}
	return postMailJSON(apiBase("https://api.brevo.com")+"/v3/smtp/email",
		map[string]string{"api-key": key, "accept": "application/json"},
		map[string]interface{}{
			"sender":      map[string]string{"email": from, "name": name},
			"to":          []map[string]string{{"email": m.To}},
			"subject":     m.Subject,
			"htmlContent": m.HTML,
		})
}

func sendResend(m Mail) error {
	key := strings.TrimSpace(os.Getenv("RESEND_API_KEY"))
	if key == "" {
		return fmt.Errorf("RESEND_API_KEY must be set when MAIL_PROVIDER=resend")
	}
	from, name, err := mailFrom()
	if err != nil {
		return err
	}
	return postMailJSON(apiBase("https://api.resend.com")+"/emails",
		map[string]string{"Authorization": "Bearer " + key},
		map[string]interface{}{
			"from":    fmt.Sprintf("%s <%s>", name, from),
			"to":      []string{m.To},
			"subject": m.Subject,
			"html":    m.HTML,
		})
}

// sendSMTP is the original Gmail sender. It needs an App Password and an outbound SMTP port.
func sendSMTP(m Mail) error {
	username := os.Getenv("MAIL_USERNAME")
	password := os.Getenv("MAIL_PASSWORD")
	if username == "" || password == "" {
		return fmt.Errorf("MAIL_USERNAME and MAIL_PASSWORD must be set when mail is enabled")
	}
	const host, port = "smtp.gmail.com", "587"
	auth := smtp.PlainAuth("", username, password, host)
	msg := []byte("Subject: " + m.Subject + "\nMIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n" + m.HTML)
	return smtp.SendMail(host+":"+port, auth, username, []string{m.To}, msg)
}
