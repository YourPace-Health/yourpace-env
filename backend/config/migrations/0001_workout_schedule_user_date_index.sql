-- Schedules are looked up by (user_id, scheduled_date) on every generate/plan/reschedule call.
CREATE INDEX IF NOT EXISTS idx_workout_schedules_user_date
    ON workout_schedules (user_id, scheduled_date);
