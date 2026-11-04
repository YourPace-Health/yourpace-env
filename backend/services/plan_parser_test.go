package services

import (
	"reflect"
	"testing"
	"time"
)

var testLoc = time.FixedZone("ICT", 7*3600)

func TestParsePlannedWorkoutsNoBlocks(t *testing.T) {
	if got := ParsePlannedWorkouts("no blocks here", time.Now(), testLoc); got != nil {
		t.Errorf("want nil, got %v", got)
	}
}

func TestParsePlannedWorkoutsFull(t *testing.T) {
	reply := "[TIME: 05/11/2569 18:00 ถึง 19:30][EVENT: Leg day][INTENSITY: intense]" +
		"[DESC: • Squat - legs\n• เผาผลาญประมาณ: 320 kcal]" +
		"[TIME: 19:00 - 19:20][EVENT: Stretch]"
	today := time.Date(2026, 11, 3, 9, 0, 0, 0, testLoc)

	got := ParsePlannedWorkouts(reply, today, testLoc)
	if len(got) != 2 {
		t.Fatalf("got %d workouts, want 2", len(got))
	}

	w := got[0]
	if w.Title != "Leg day" || w.Intensity != "INTENSE" {
		t.Errorf("first = %+v", w)
	}
	// Buddhist year 2569 -> 2026, start time from the range
	if want := time.Date(2026, 11, 5, 18, 0, 0, 0, testLoc); !w.Date.Equal(want) {
		t.Errorf("date = %v, want %v", w.Date, want)
	}
	if w.DurationMinutes != 90 {
		t.Errorf("duration = %d, want 90", w.DurationMinutes)
	}
	if w.BurnedCalories != 320 {
		t.Errorf("burned = %v, want 320", w.BurnedCalories)
	}

	s := got[1]
	// No date: today + block index (1), default intensity, calories from duration
	if want := time.Date(2026, 11, 4, 19, 0, 0, 0, testLoc); !s.Date.Equal(want) {
		t.Errorf("second date = %v, want %v", s.Date, want)
	}
	if s.Intensity != "MODERATE" || s.DurationMinutes != 20 || s.BurnedCalories != 130 {
		t.Errorf("second = %+v", s)
	}
}

func TestParsePlannedWorkoutsSkipsIncompleteBlocks(t *testing.T) {
	reply := "[TIME: 10:00 - 11:00][INTENSITY: LIGHT]" + // no EVENT
		"[TIME: 12:00 - 12:30][EVENT: Walk]"
	got := ParsePlannedWorkouts(reply, time.Now(), testLoc)
	if len(got) != 1 || got[0].Title != "Walk" {
		t.Errorf("got %+v", got)
	}
}

func TestParsePlannedWorkoutsDefaultDuration(t *testing.T) {
	got := ParsePlannedWorkouts("[TIME: evening][EVENT: Run]", time.Now(), testLoc)
	if len(got) != 1 || got[0].DurationMinutes != 45 {
		t.Errorf("got %+v", got)
	}
}

func TestExtractExerciseNames(t *testing.T) {
	desc := "• Dumbbell Goblet Squats - 3x12\n" +
		"- Push-ups\n" +
		"* (Plank) - hold\n" +
		"• ประโยชน์: strength\n" +
		"• เผาผลาญประมาณ: 200\n" +
		"• # heading\n" +
		"• คำแนะนำ: rest\n" +
		"• อุปกรณ์ - none\n" +
		"not a bullet\n"
	got := ExtractExerciseNames(desc)
	want := []string{"Dumbbell Goblet Squats", "Push", "Plank"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
}
