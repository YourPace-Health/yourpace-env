package services

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// geminiBody wraps text in a Gemini generateContent response.
func geminiBody(text string) string {
	return `{"candidates":[{"content":{"parts":[{"text":` + jsonString(text) + `}]}}]}`
}

// unwrapEnvelope lets older tests keep passing replies shaped like {"output":"..."} /
// {"chatResponse":"..."}: the inner string is what Gemini would return as text.
func unwrapEnvelope(reply string) string {
	var m map[string]interface{}
	if json.Unmarshal([]byte(reply), &m) == nil {
		for _, k := range []string{"chatResponse", "output"} {
			if v, ok := m[k].(string); ok && v != "" {
				return v
			}
		}
	}
	return reply
}

// fakeAI starts a fake Gemini API and points GEMINI_URL at it. The reply text is
// returned to the caller of CallGemini.
func fakeAI(t *testing.T, reply string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(geminiBody(unwrapEnvelope(reply))))
	}))
	t.Cleanup(srv.Close)
	t.Setenv("GEMINI_API_KEY", "test-key")
	t.Setenv("GEMINI_URL", srv.URL)
	return srv
}

func TestCallGeminiDirect(t *testing.T) {
	fakeAI(t, "from gemini")
	got, err := CallGemini("q")
	if err != nil || got != "from gemini" {
		t.Fatalf("got %q, %v", got, err)
	}
}

func TestCallGeminiFallsBackToDirectAPI(t *testing.T) {
	direct := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(geminiOK()))
	}))
	defer direct.Close()
	t.Setenv("GEMINI_API_KEY", "real-key")
	t.Setenv("GEMINI_URL", direct.URL)

	got, err := CallGemini("q")
	if err != nil || got != "hello" {
		t.Fatalf("got %q, %v", got, err)
	}
}

func TestCallGeminiDirectAPIFailureModes(t *testing.T) {
	for name, handler := range map[string]http.HandlerFunc{
		"bad status": func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(400) },
		"bad json":   func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("nope")) },
		"no candidates": func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte(`{"candidates":[]}`))
		},
	} {
		t.Run(name, func(t *testing.T) {
			direct := httptest.NewServer(handler)
			defer direct.Close()
			t.Setenv("GEMINI_API_KEY", "real-key")
			t.Setenv("GEMINI_URL", direct.URL)
			if _, err := CallGemini("q"); err == nil {
				t.Fatal("expected an error")
			}
		})
	}
}

func TestCallGeminiNoBackendAvailable(t *testing.T) {
	t.Setenv("GEMINI_API_KEY", "")
	if _, err := CallGemini("q"); err == nil {
		t.Fatal("expected an error when nothing is reachable")
	}
}

func TestAnalyzeMealStructured(t *testing.T) {
	fakeAI(t, "```json\n"+`{"calories":300,"protein":20,"carbs":30,"fat":10,"healthScore":90,"summary":"s","tips":"t"}`+"\n```")
	got, err := AnalyzeMealStructured("rice", "LOSE_WEIGHT")
	if err != nil || got.Calories != 300 || got.HealthScore != 90 || got.Tips != "t" {
		t.Fatalf("got %+v, %v", got, err)
	}
}

func TestAnalyzeMealStructuredFallsBackOnPlainText(t *testing.T) {
	fakeAI(t, "```\nnot json\n```")
	got, err := AnalyzeMealStructured("rice", "g")
	if err != nil || got.Calories != 450 || !strings.Contains(got.Summary, "not json") {
		t.Fatalf("got %+v, %v", got, err)
	}
}

func TestAnalyzeMealStructuredPropagatesError(t *testing.T) {
	t.Setenv("GEMINI_API_KEY", "")
	if _, err := AnalyzeMealStructured("x", "y"); err == nil {
		t.Error("expected error")
	}
	if _, err := AnalyzeMeal("x", "y"); err == nil {
		t.Error("expected error from AnalyzeMeal")
	}
}

func TestAnalyzeMealFormatsText(t *testing.T) {
	fakeAI(t, `{"output":"{\"calories\":250,\"protein\":10.5,\"carbs\":20,\"fat\":5,\"healthScore\":70,\"summary\":\"good\",\"tips\":\"walk\"}"}`)
	got, err := AnalyzeMeal("salad", "g")
	if err != nil || !strings.Contains(got, "250 kcal") || !strings.Contains(got, "good") || !strings.Contains(got, "walk") {
		t.Fatalf("got %q, %v", got, err)
	}
}

func TestChatWithMentorIncludesHistory(t *testing.T) {
	var prompt string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		prompt = string(b)
		w.Write([]byte(geminiBody("answer")))
	}))
	defer srv.Close()
	t.Setenv("GEMINI_API_KEY", "test-key")
	t.Setenv("GEMINI_URL", srv.URL)

	got, err := ChatWithMentor("profile", "earlier talk", "how?")
	if err != nil || got != "answer" {
		t.Fatalf("got %q, %v", got, err)
	}
	if !strings.Contains(prompt, "earlier talk") {
		t.Error("history missing from prompt")
	}
	prompt = ""
	if _, err := ChatWithMentor("profile", "", "how?"); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(prompt, "earlier talk") {
		t.Error("history should be omitted when empty")
	}
}

func visionServer(t *testing.T, text string) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"candidates":[{"content":{"parts":[{"text":` + jsonString(text) + `}]}}]}`))
	}))
	t.Cleanup(srv.Close)
	t.Setenv("GEMINI_API_KEY", "k")
	t.Setenv("GEMINI_URL", srv.URL)
}

func jsonString(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `"`, `\"`, "\n", `\n`)
	return `"` + r.Replace(s) + `"`
}

func TestAnalyzeMealPhoto(t *testing.T) {
	visionServer(t, "```json\n"+`{"mealName":"Pad Thai","calories":600,"protein":25,"carbs":70,"fat":20,"healthScore":65,"summary":"noodles","tips":"less oil"}`+"\n```")
	got, err := AnalyzeMealPhoto("AAAA", "", "g")
	if err != nil || got.Calories != 600 || !strings.HasPrefix(got.Summary, "Pad Thai - noodles") {
		t.Fatalf("got %+v, %v", got, err)
	}
}

func TestAnalyzeMealPhotoDefaultsMealName(t *testing.T) {
	visionServer(t, `{"calories":100,"summary":"x"}`)
	got, _ := AnalyzeMealPhoto("AAAA", "image/png", "g")
	if !strings.Contains(got.Summary, "อาหารจากการสแกนภาพ") {
		t.Errorf("summary = %q", got.Summary)
	}
}

func TestAnalyzeMealPhotoFallbacks(t *testing.T) {
	visionServer(t, "not json at all")
	got, err := AnalyzeMealPhoto("AAAA", "image/png", "g")
	if err != nil || got.Calories != 520 || got.Summary != "สแกนอาหารสำเร็จ" {
		t.Fatalf("unparsable reply: %+v, %v", got, err)
	}

	t.Setenv("GEMINI_URL", "http://127.0.0.1:1/dead")
	got, err = AnalyzeMealPhoto("AAAA", "image/png", "g")
	if err != nil || got.Calories != 520 || got.Summary == "สแกนอาหารสำเร็จ" {
		t.Fatalf("unreachable vision API: %+v, %v", got, err)
	}
}

func TestCallGeminiVisionFailureModes(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(400) }))
	defer srv.Close()
	t.Setenv("GEMINI_API_KEY", "k")
	t.Setenv("GEMINI_URL", srv.URL+"?key=old")
	if _, err := CallGeminiVision("p", "image/png", "A"); err == nil || !strings.Contains(err.Error(), "400") {
		t.Errorf("err = %v", err)
	}

	empty := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"candidates":[]}`)) }))
	defer empty.Close()
	t.Setenv("GEMINI_URL", empty.URL)
	if _, err := CallGeminiVision("p", "image/png", "A"); err == nil {
		t.Error("empty candidates must error")
	}

	bad := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`nope`)) }))
	defer bad.Close()
	t.Setenv("GEMINI_URL", bad.URL)
	if _, err := CallGeminiVision("p", "image/png", "A"); err == nil {
		t.Error("bad json must error")
	}
}

func TestGenerateDailyNutritionFeedback(t *testing.T) {
	fakeAI(t, `{"output":"{\"dietScore\":9,\"title\":\"Great\",\"highlights\":[\"a\"],\"suggestions\":[\"b\"],\"coachNote\":\"go\"}"}`)
	got, err := GenerateDailyNutritionFeedback("summary", "g", 1800, 2000, 300)
	if err != nil || got.DietScore != 9 || got.Title != "Great" {
		t.Fatalf("got %+v, %v", got, err)
	}
}

func TestGenerateDailyNutritionFeedbackFallbacks(t *testing.T) {
	fakeAI(t, "plain words")
	got, err := GenerateDailyNutritionFeedback("s", "g", 1, 2, 3)
	if err != nil || got.Title != "ภาพรวมโภชนาการประจำวัน" {
		t.Fatalf("unparsable: %+v, %v", got, err)
	}

	t.Setenv("GEMINI_API_KEY", "")
	got, err = GenerateDailyNutritionFeedback("s", "g", 1, 2, 3)
	if err != nil || got.Title != "ภาพรวมโภชนาการอยู่ในเกณฑ์ดี" {
		t.Fatalf("AI down: %+v, %v", got, err)
	}
}
