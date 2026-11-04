package services

import (
	"math"
	"strings"
	"testing"
)

func TestStripCodeFence(t *testing.T) {
	cases := map[string]string{
		"  plain  ":                  "plain",
		"```json\n{\"a\":1}\n```":     `{"a":1}`,
		"intro ```\n{\"a\":1}\n``` x": `{"a":1}`,
	}
	for in, want := range cases {
		if got := StripCodeFence(in); got != want {
			t.Errorf("StripCodeFence(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestParseBurnReplyFull(t *testing.T) {
	reply := "```json\n" + `{"light":{"calories":100,"description":"easy"},` +
		`"moderate":{"calories":"200","description":"mid"},` +
		`"intense":{"calories":300},"explanation":"why"}` + "\n```"
	est := ParseBurnReply(reply)
	if est.Light.Calories != 100 || est.Moderate.Calories != 200 || est.Intense.Calories != 300 {
		t.Fatalf("calories = %+v", est)
	}
	if est.Light.Description != "easy" || est.Explanation != "why" {
		t.Errorf("text fields = %+v", est)
	}
}

func TestParseBurnReplySingleValue(t *testing.T) {
	est := ParseBurnReply(`{"burnedCalories": 200}`)
	if est.Moderate.Calories != 200 || est.Light.Calories != 160 || math.Abs(est.Intense.Calories-260) > 1e-9 {
		t.Errorf("got %+v", est)
	}
}

func TestParseBurnReplyInvalid(t *testing.T) {
	if est := ParseBurnReply("not json"); est != (BurnEstimate{}) {
		t.Errorf("want zero estimate, got %+v", est)
	}
}

func TestFillBurnDefaults(t *testing.T) {
	est := FillBurnDefaults(BurnEstimate{}, 60, 30)
	// 6.0 METs * 3.5 * 60kg / 200 * 30min = 189
	if math.Abs(est.Moderate.Calories-189) > 1e-9 {
		t.Errorf("moderate = %v, want 189", est.Moderate.Calories)
	}
	if !(est.Light.Calories < est.Moderate.Calories && est.Moderate.Calories < est.Intense.Calories) {
		t.Errorf("levels not ordered: %+v", est)
	}
	if est.Light.Description == "" || est.Moderate.Description == "" || est.Intense.Description == "" {
		t.Error("descriptions not filled")
	}
	if !strings.Contains(est.Explanation, "60.0") || !strings.Contains(est.Explanation, "30") {
		t.Errorf("explanation = %q", est.Explanation)
	}
}

func TestFillBurnDefaultsKeepsProvidedValues(t *testing.T) {
	in := BurnEstimate{Moderate: BurnLevel{Calories: 500, Description: "custom"}, Explanation: "mine"}
	out := FillBurnDefaults(in, 60, 30)
	if out.Moderate.Calories != 500 || out.Moderate.Description != "custom" || out.Explanation != "mine" {
		t.Errorf("provided values overwritten: %+v", out)
	}
}
