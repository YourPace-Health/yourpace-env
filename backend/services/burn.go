package services

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// Default intensity descriptions shown when the AI reply omits them.
const (
	defaultLightDesc    = "สบายๆ พูดคุยได้ต่อเนื่อง"
	defaultModerateDesc = "เหงื่อซึม หายใจเร็วขึ้น"
	defaultIntenseDesc  = "เหนื่อยหอบ ท้าทาย"
)

// BurnLevel is the estimated calories and a short feel description for one intensity.
type BurnLevel struct {
	Calories    float64
	Description string
}

// BurnEstimate holds the three intensity levels plus an explanation.
type BurnEstimate struct {
	Light, Moderate, Intense BurnLevel
	Explanation              string
}

// StripCodeFence returns the content of the first ``` (or ```json) fenced
// block in s, or s trimmed when there is no fence.
func StripCodeFence(s string) string {
	s = strings.TrimSpace(s)
	if strings.Contains(s, "```json") {
		s = strings.Split(s, "```json")[1]
		s = strings.Split(s, "```")[0]
	} else if strings.Contains(s, "```") {
		s = strings.Split(s, "```")[1]
		s = strings.Split(s, "```")[0]
	}
	return strings.TrimSpace(s)
}

func toFloat(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case string:
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f
		}
	}
	return 0
}

type burnLevelJSON struct {
	Calories    interface{} `json:"calories"`
	Description string      `json:"description"`
}

// ParseBurnReply reads the AI's JSON reply. Unparseable input yields a zero
// estimate, which FillBurnDefaults then completes from METs.
func ParseBurnReply(reply string) BurnEstimate {
	var parsed struct {
		Light          burnLevelJSON `json:"light"`
		Moderate       burnLevelJSON `json:"moderate"`
		Intense        burnLevelJSON `json:"intense"`
		BurnedCalories interface{}   `json:"burnedCalories"`
		Explanation    string        `json:"explanation"`
	}
	if err := json.Unmarshal([]byte(StripCodeFence(reply)), &parsed); err != nil {
		return BurnEstimate{}
	}

	est := BurnEstimate{
		Light:       BurnLevel{toFloat(parsed.Light.Calories), parsed.Light.Description},
		Moderate:    BurnLevel{toFloat(parsed.Moderate.Calories), parsed.Moderate.Description},
		Intense:     BurnLevel{toFloat(parsed.Intense.Calories), parsed.Intense.Description},
		Explanation: parsed.Explanation,
	}
	// A single burnedCalories value stands in for the moderate level.
	if est.Moderate.Calories <= 0 && parsed.BurnedCalories != nil {
		if base := toFloat(parsed.BurnedCalories); base > 0 {
			est.Moderate.Calories = base
			est.Light.Calories = base * 0.8
			est.Intense.Calories = base * 1.3
		}
	}
	return est
}

// FillBurnDefaults replaces missing calories with a METs estimate
// (3.5 / 6.0 / 8.5 METs) and fills empty descriptions and explanation.
func FillBurnDefaults(est BurnEstimate, weightKg float64, minutes int) BurnEstimate {
	mets := func(m float64) float64 { return (m * 3.5 * weightKg / 200.0) * float64(minutes) }
	if est.Light.Calories <= 0 {
		est.Light.Calories = mets(3.5)
	}
	if est.Moderate.Calories <= 0 {
		est.Moderate.Calories = mets(6.0)
	}
	if est.Intense.Calories <= 0 {
		est.Intense.Calories = mets(8.5)
	}
	if est.Light.Description == "" {
		est.Light.Description = defaultLightDesc
	}
	if est.Moderate.Description == "" {
		est.Moderate.Description = defaultModerateDesc
	}
	if est.Intense.Description == "" {
		est.Intense.Description = defaultIntenseDesc
	}
	if est.Explanation == "" {
		est.Explanation = fmt.Sprintf("คำนวณตามมาตรฐาน METs สำหรับน้ำหนัก %.1f กก. ระยะเวลา %d นาที", weightKg, minutes)
	}
	return est
}
