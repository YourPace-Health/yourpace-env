package handlers

import (
	"testing"
	"time"

	"youpace/config"
	"youpace/models"
)

type sentMail struct {
	email, title string
	minutes      int
}

func captureReminders(t *testing.T) *[]sentMail {
	t.Helper()
	var sent []sentMail
	orig := reminderSender
	reminderSender = func(email, title string, minutes int) error {
		sent = append(sent, sentMail{email, title, minutes})
		return nil
	}
	t.Cleanup(func() { reminderSender = orig })
	return &sent
}

func addWorkout(t *testing.T, u models.User, title, status string, day time.Time) models.WorkoutSchedule {
	t.Helper()
	w := models.WorkoutSchedule{UserID: u.UserID, Title: title, ScheduledDate: day, DurationMinutes: 30, Status: status}
	if err := config.DB.Create(&w).Error; err != nil {
		t.Fatal(err)
	}
	return w
}

func TestSendDueRemindersOncePerWorkout(t *testing.T) {
	setupTestDB(t)
	sent := captureReminders(t)

	u := createUser(t, "r@example.com", "x", true)
	config.DB.Create(&models.UserSetting{UserID: u.UserID, NotificationsEnabled: true, DefaultNotifyTime: "09:00", Timezone: "Asia/Bangkok"})

	bkk := time.FixedZone("ICT", 7*3600)
	now := time.Date(2026, 11, 5, 9, 30, 0, 0, bkk)
	w := addWorkout(t, u, "Leg day", "PENDING", time.Date(2026, 11, 5, 0, 0, 0, 0, time.UTC))

	if n := SendDueReminders(now); n != 1 {
		t.Fatalf("sent %d, want 1", n)
	}
	if len(*sent) != 1 || (*sent)[0].email != "r@example.com" || (*sent)[0].title != "Leg day" || (*sent)[0].minutes != 30 {
		t.Fatalf("unexpected mail: %+v", *sent)
	}

	var got models.WorkoutSchedule
	config.DB.First(&got, "schedule_id = ?", w.ScheduleID)
	if got.ReminderSentAt == nil {
		t.Error("ReminderSentAt should be recorded")
	}

	if n := SendDueReminders(now.Add(time.Minute)); n != 0 {
		t.Errorf("second pass sent %d, want 0 (already reminded)", n)
	}
}

func TestSendDueRemindersSkipsIneligible(t *testing.T) {
	setupTestDB(t)
	sent := captureReminders(t)

	bkk := time.FixedZone("ICT", 7*3600)
	today := time.Date(2026, 11, 5, 0, 0, 0, 0, time.UTC)
	now := time.Date(2026, 11, 5, 9, 30, 0, 0, bkk)

	off := createUser(t, "off@example.com", "x", true)
	config.DB.Create(&models.UserSetting{UserID: off.UserID, DefaultNotifyTime: "09:00", Timezone: "Asia/Bangkok"})
	config.DB.Model(&models.UserSetting{}).Where("user_id = ?", off.UserID).Update("notifications_enabled", false)
	addWorkout(t, off, "notifications off", "PENDING", today)

	noRow := createUser(t, "norow@example.com", "x", true)
	addWorkout(t, noRow, "no settings row", "PENDING", today)

	done := createUser(t, "done@example.com", "x", true)
	config.DB.Create(&models.UserSetting{UserID: done.UserID, NotificationsEnabled: true, DefaultNotifyTime: "09:00", Timezone: "Asia/Bangkok"})
	addWorkout(t, done, "already completed", "COMPLETED", today)

	late := createUser(t, "late@example.com", "x", true)
	config.DB.Create(&models.UserSetting{UserID: late.UserID, NotificationsEnabled: true, DefaultNotifyTime: "18:00", Timezone: "Asia/Bangkok"})
	addWorkout(t, late, "not yet time", "PENDING", today)

	tomorrow := createUser(t, "tomorrow@example.com", "x", true)
	config.DB.Create(&models.UserSetting{UserID: tomorrow.UserID, NotificationsEnabled: true, DefaultNotifyTime: "09:00", Timezone: "Asia/Bangkok"})
	addWorkout(t, tomorrow, "another day", "PENDING", today.AddDate(0, 0, 1))

	if n := SendDueReminders(now); n != 0 {
		t.Errorf("sent %d, want 0; mails: %+v", n, *sent)
	}
}

func todayUTC() time.Time {
	n := time.Now()
	return time.Date(n.Year(), n.Month(), n.Day(), 0, 0, 0, 0, time.UTC)
}
