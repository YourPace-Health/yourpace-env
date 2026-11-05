package services

import (
	"testing"
	"time"
)

func TestReminderDue(t *testing.T) {
	bkk := time.FixedZone("ICT", 7*3600)
	day := time.Date(2026, 11, 5, 0, 0, 0, 0, time.UTC) // a DATE column value
	at := func(h, m int) time.Time { return time.Date(2026, 11, 5, h, m, 0, 0, bkk) }

	cases := []struct {
		name   string
		now    time.Time
		tz     string
		notify string
		date   time.Time
		want   bool
	}{
		{"before notify time", at(8, 59), "Asia/Bangkok", "09:00", day, false},
		{"exactly at notify time", at(9, 0), "Asia/Bangkok", "09:00", day, true},
		{"within grace", at(14, 59), "Asia/Bangkok", "09:00", day, true},
		{"after grace", at(15, 0), "Asia/Bangkok", "09:00", day, false},
		{"different day", at(9, 30), "Asia/Bangkok", "09:00", day.AddDate(0, 0, 1), false},
		{"empty notify time defaults to 09:00", at(9, 5), "Asia/Bangkok", "", day, true},
		{"invalid notify time defaults to 09:00", at(8, 0), "Asia/Bangkok", "soon", day, false},
		{"empty timezone defaults to Bangkok", at(9, 5), "", "09:00", day, true},
		{"invalid timezone defaults to Bangkok", at(9, 5), "Mars/Base", "09:00", day, true},
		// 02:30 UTC on the 5th is 09:30 in Bangkok but 18:30 on the 4th in Los Angeles
		{"other timezone, same instant", at(9, 30), "America/Los_Angeles", "09:00", day, false},
		{"other timezone, its own morning", time.Date(2026, 11, 5, 9, 30, 0, 0, time.FixedZone("PST", -8*3600)), "America/Los_Angeles", "09:00", day, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := ReminderDue(tc.now, tc.tz, tc.notify, tc.date); got != tc.want {
				t.Errorf("ReminderDue = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestSendWorkoutReminderMockMode(t *testing.T) {
	t.Setenv("MAIL_ENABLED", "false")
	if err := SendWorkoutReminder("a@example.com", "Leg day", 30); err != nil {
		t.Errorf("mock mode must not fail: %v", err)
	}
}

func TestSendWorkoutReminderNeedsCredentials(t *testing.T) {
	t.Setenv("MAIL_ENABLED", "true")
	t.Setenv("MAIL_USERNAME", "")
	t.Setenv("MAIL_PASSWORD", "")
	if err := SendWorkoutReminder("a@example.com", "Leg day", 30); err == nil {
		t.Error("expected an error when mail is enabled without credentials")
	}
}
