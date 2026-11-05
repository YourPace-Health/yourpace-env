package services

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
	"time"
)

const (
	defaultReminderTime = "09:00"
	defaultReminderZone = "Asia/Bangkok"
	// reminderGrace is how long after the notify time a reminder may still go out
	// (covers a restart); later than that it would just be noise.
	reminderGrace = 6 * time.Hour
)

// ReminderDue reports whether a workout scheduled on scheduledDate should be
// reminded about at now: it is the workout's day in the user's timezone and the
// user's notify time (HH:MM) has passed, within reminderGrace.
func ReminderDue(now time.Time, timezone, notifyTime string, scheduledDate time.Time) bool {
	loc, err := time.LoadLocation(timezone)
	if err != nil || timezone == "" {
		loc, _ = time.LoadLocation(defaultReminderZone)
		if loc == nil {
			loc = time.FixedZone("ICT", 7*3600)
		}
	}
	local := now.In(loc)

	if scheduledDate.Format("2006-01-02") != local.Format("2006-01-02") {
		return false
	}

	t, err := time.Parse("15:04", notifyTime)
	if err != nil {
		t, _ = time.Parse("15:04", defaultReminderTime)
	}
	notifyAt := time.Date(local.Year(), local.Month(), local.Day(), t.Hour(), t.Minute(), 0, 0, loc)
	return !local.Before(notifyAt) && local.Before(notifyAt.Add(reminderGrace))
}

// SendWorkoutReminder emails a reminder for today's workout. With MAIL_ENABLED
// not "true" it only logs, like the OTP mails do in development.
func SendWorkoutReminder(email, title string, minutes int) error {
	subject := "Today's workout: " + title
	body := fmt.Sprintf("<html><body><h3>Time to move! 💪</h3><p>Your workout today: <b>%s</b> (%d min).</p>"+
		"<p>Open yourPace to see the plan and log it when you're done.</p></body></html>", title, minutes)

	if os.Getenv("MAIL_ENABLED") != "true" {
		log.Printf("[MOCK MAIL] Workout reminder to %s: %s", email, title)
		return nil
	}

	username := os.Getenv("MAIL_USERNAME")
	password := os.Getenv("MAIL_PASSWORD")
	if username == "" || password == "" {
		return fmt.Errorf("MAIL_USERNAME and MAIL_PASSWORD must be set when mail is enabled")
	}

	msg := []byte("Subject: " + subject + "\nMIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n" + body)
	auth := smtp.PlainAuth("", username, password, "smtp.gmail.com")
	return smtp.SendMail("smtp.gmail.com:587", auth, username, []string{email}, msg)
}
