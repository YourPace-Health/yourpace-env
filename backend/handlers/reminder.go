package handlers

import (
	"context"
	"log"
	"time"

	"youpace/config"
	"youpace/models"
	"youpace/services"
)

// reminderSender is replaced in tests.
var reminderSender = services.SendWorkoutReminder

type dueReminderRow struct {
	ScheduleID      string
	Title           string
	DurationMinutes int
	ScheduledDate   time.Time
	Email           string
	Timezone        string
	DefaultNotify   string
}

// SendDueReminders emails each user whose pending workout is due a reminder, at most
// once per workout. Only users with a settings row and notifications enabled are
// considered. It returns how many reminders were sent.
func SendDueReminders(now time.Time) int {
	var rows []dueReminderRow
	err := config.DB.Table("workout_schedules AS w").
		Select("w.schedule_id, w.title, w.duration_minutes, w.scheduled_date, u.email, s.timezone, s.default_notify_time AS default_notify").
		Joins("JOIN users u ON u.user_id = w.user_id").
		Joins("JOIN user_settings s ON s.user_id = w.user_id").
		Where("w.status = ? AND w.reminder_sent_at IS NULL AND s.notifications_enabled = ?", "PENDING", true).
		Where("w.scheduled_date BETWEEN ? AND ?", now.AddDate(0, 0, -1).Format("2006-01-02"), now.AddDate(0, 0, 1).Format("2006-01-02")).
		Scan(&rows).Error
	if err != nil {
		log.Printf("Reminder query failed: %v", err)
		return 0
	}

	sent := 0
	for _, r := range rows {
		if !services.ReminderDue(now, r.Timezone, r.DefaultNotify, r.ScheduledDate) {
			continue
		}
		if err := reminderSender(r.Email, r.Title, r.DurationMinutes); err != nil {
			log.Printf("Reminder to %s failed: %v", r.Email, err)
			continue
		}
		config.DB.Model(&models.WorkoutSchedule{}).Where("schedule_id = ?", r.ScheduleID).Update("reminder_sent_at", now)
		sent++
	}
	return sent
}

// StartReminderWorker checks for due reminders every interval until ctx is cancelled.
func StartReminderWorker(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			if n := SendDueReminders(now); n > 0 {
				log.Printf("Sent %d workout reminder(s)", n)
			}
		}
	}
}
