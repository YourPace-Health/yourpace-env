package services

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

var (
	reTime      = regexp.MustCompile(`\[TIME:\s*([^\]]+)\]`)
	reEvent     = regexp.MustCompile(`\[EVENT:\s*([^\]]+)\]`)
	reIntensity = regexp.MustCompile(`\[INTENSITY:\s*([^\]]+)\]`)
	reDate      = regexp.MustCompile(`(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})`)
	reTimeRange = regexp.MustCompile(`(\d{1,2}):(\d{2})\s*(?:ถึง|-|to)\s*(\d{1,2}):(\d{2})`)
	reBurn      = regexp.MustCompile(`เผาผลาญประมาณ:\s*(\d+(?:\.\d+)?)`)
)

// PlannedWorkout is one workout block parsed from the n8n planner's reply.
type PlannedWorkout struct {
	Title           string
	Date            time.Time
	DurationMinutes int
	Intensity       string
	BurnedCalories  float64
	Description     string
}

// ParsePlannedWorkouts splits a reply made of [TIME: ..][EVENT: ..]
// [INTENSITY: ..][DESC: ..] blocks. Blocks without TIME or EVENT are skipped.
// A block without a date goes on today plus its block index; Buddhist-era years
// are converted to Gregorian.
func ParsePlannedWorkouts(aiReply string, today time.Time, loc *time.Location) []PlannedWorkout {
	blocks := strings.Split(aiReply, "[TIME:")
	if len(blocks) <= 1 {
		return nil
	}

	var out []PlannedWorkout
	for idx, block := range blocks[1:] {
		full := "[TIME:" + block
		timeMatch := reTime.FindStringSubmatch(full)
		eventMatch := reEvent.FindStringSubmatch(full)
		if len(timeMatch) < 2 || len(eventMatch) < 2 {
			continue
		}
		timeRaw := strings.TrimSpace(timeMatch[1])

		intensity := "MODERATE"
		if m := reIntensity.FindStringSubmatch(full); len(m) >= 2 {
			intensity = strings.ToUpper(strings.TrimSpace(m[1]))
		}

		desc := ""
		if i := strings.Index(full, "[DESC:"); i != -1 {
			desc = strings.TrimSpace(full[i+6:])
			if next := strings.Index(desc, "][TIME:"); next != -1 {
				desc = strings.TrimSpace(desc[:next])
			} else if strings.HasSuffix(desc, "]") {
				desc = strings.TrimSpace(desc[:len(desc)-1])
			}
		}

		date := today.AddDate(0, 0, idx)
		if d := reDate.FindStringSubmatch(timeRaw); len(d) == 4 {
			day, _ := strconv.Atoi(d[1])
			month, _ := strconv.Atoi(d[2])
			year, _ := strconv.Atoi(d[3])
			if year > 2500 {
				year -= 543
			}
			date = time.Date(year, time.Month(month), day, 10, 0, 0, 0, loc)
		}

		duration := 45
		if t := reTimeRange.FindStringSubmatch(timeRaw); len(t) == 5 {
			h1, _ := strconv.Atoi(t[1])
			m1, _ := strconv.Atoi(t[2])
			h2, _ := strconv.Atoi(t[3])
			m2, _ := strconv.Atoi(t[4])
			if end, start := h2*60+m2, h1*60+m1; end > start {
				duration = end - start
			}
			date = time.Date(date.Year(), date.Month(), date.Day(), h1, m1, 0, 0, loc)
		}

		burned := 0.0
		if c := reBurn.FindStringSubmatch(desc); len(c) >= 2 {
			burned, _ = strconv.ParseFloat(c[1], 64)
		}
		if burned == 0 {
			burned = float64(duration) * 6.5
		}

		out = append(out, PlannedWorkout{
			Title:           strings.TrimSpace(eventMatch[1]),
			Date:            date,
			DurationMinutes: duration,
			Intensity:       intensity,
			BurnedCalories:  burned,
			Description:     desc,
		})
	}
	return out
}

// ExtractExerciseNames returns the exercise names from the bulleted lines of a
// workout description, skipping benefit/calorie/tip lines and labels.
func ExtractExerciseNames(desc string) []string {
	var names []string
	for _, line := range strings.Split(desc, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || (!strings.HasPrefix(line, "•") && !strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "*")) {
			continue
		}
		clean := strings.TrimLeft(line, "•-* \t")
		if strings.HasPrefix(clean, "ประโยชน์") || strings.HasPrefix(clean, "เผาผลาญ") ||
			strings.HasPrefix(clean, "#") || strings.HasPrefix(clean, "คำแนะนำ") {
			continue
		}
		name := strings.Trim(strings.TrimSpace(strings.Split(clean, "-")[0]), "()[]{}*# \t")
		if name == "" || strings.EqualFold(name, "อุปกรณ์") || strings.EqualFold(name, "กล้ามเนื้อ") {
			continue
		}
		names = append(names, name)
	}
	return names
}
