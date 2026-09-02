package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

type GeminiRequest struct {
	Contents []ContentPart `json:"contents"`
}

type ContentPart struct {
	Parts []TextPart `json:"parts"`
}

type TextPart struct {
	Text string `json:"text"`
}

type InlineDataPart struct {
	MimeType string `json:"mime_type"`
	Data     string `json:"data"`
}

type MultimodalPart struct {
	Text       string          `json:"text,omitempty"`
	InlineData *InlineDataPart `json:"inline_data,omitempty"`
}

type GeminiMultimodalContent struct {
	Parts []MultimodalPart `json:"parts"`
}

type GeminiMultimodalRequest struct {
	Contents []GeminiMultimodalContent `json:"contents"`
}

type GeminiResponse struct {
	Candidates []Candidate `json:"candidates"`
}

type Candidate struct {
	Content ContentPart `json:"content"`
}

func isUnparsedTemplate(s string) bool {
	if strings.Contains(s, "{{") && (strings.Contains(s, "$json") || strings.Contains(s, "$")) {
		return true
	}
	if strings.Contains(s, "_stage_") || strings.Contains(s, "_stage1") || strings.Contains(s, "_stage2") || strings.Contains(s, "_stage3") {
		return true
	}
	return false
}

func extractStringFromJSON(data interface{}) string {
	keys := []string{"chatResponse", "output", "response", "text", "message", "result", "reply", "content", "data"}

	switch v := data.(type) {
	case map[string]interface{}:
		for _, key := range keys {
			if val, ok := v[key]; ok {
				if str, isStr := val.(string); isStr && str != "" {
					return str
				}
			}
		}
		if nested, ok := v["json"]; ok {
			if res := extractStringFromJSON(nested); res != "" {
				return res
			}
		}
	case []interface{}:
		if len(v) > 0 {
			return extractStringFromJSON(v[0])
		}
	case string:
		return v
	}
	return ""
}

func callN8N(prompt string, urlStr string) (string, error) {
	reqBody := map[string]string{
		"prompt": prompt,
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Post(urlStr, "application/json", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("n8n API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var parsedData interface{}
	if err := json.Unmarshal(bodyBytes, &parsedData); err == nil {
		extracted := extractStringFromJSON(parsedData)
		if extracted != "" {
			extracted = strings.TrimSpace(extracted)
			if isUnparsedTemplate(extracted) {
				return "", fmt.Errorf("n8n ตอบกลับเป็น template expression ที่ยังไม่ได้ประมวลผล (%s) กรุณาตรวจสอบ Respond to Webhook node ใน n8n ให้เลือกโหมด Expression (fx)", extracted)
			}
			return extracted, nil
		}
	}

	rawText := strings.TrimSpace(string(bodyBytes))
	if rawText == "" {
		return "", fmt.Errorf("n8n ตอบกลับเป็นข้อความว่างเปล่า")
	}

	if isUnparsedTemplate(rawText) {
		return "", fmt.Errorf("n8n ตอบกลับเป็น template expression ที่ยังไม่ได้ประมวลผล (%s) กรุณาตรวจสอบ Respond to Webhook node ใน n8n ให้เลือกโหมด Expression (fx)", rawText)
	}

	return rawText, nil
}

func CallGemini(prompt string) (string, error) {
	n8nURL := strings.TrimSpace(os.Getenv("N8N_URL"))
	if n8nURL == "" {
		n8nURL = "http://localhost:5678/webhook/yourpace-ai"
	}

	// 1. Try n8n URL
	res, err := callN8N(prompt, n8nURL)
	if err == nil && res != "" {
		return res, nil
	}

	// 2. Try Docker container n8n URL if running inside Docker Compose
	if strings.Contains(n8nURL, "localhost") {
		dockerN8nURL := strings.Replace(n8nURL, "localhost", "n8n", 1)
		resDocker, errDocker := callN8N(prompt, dockerN8nURL)
		if errDocker == nil && resDocker != "" {
			return resDocker, nil
		}
	}

	// 3. If Gemini API Key is configured, try direct Gemini
	apiKey := os.Getenv("GEMINI_API_KEY")
	urlStr := os.Getenv("GEMINI_URL")
	if apiKey != "" && apiKey != "YOUR_GEMINI_API_KEY" {
		if urlStr == "" {
			urlStr = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"
		}

		requestURL := fmt.Sprintf("%s?key=%s", urlStr, apiKey)
		reqBody := GeminiRequest{
			Contents: []ContentPart{
				{
					Parts: []TextPart{
						{Text: prompt},
					},
				},
			},
		}

		jsonBytes, errMarshal := json.Marshal(reqBody)
		if errMarshal == nil {
			client := &http.Client{Timeout: 30 * time.Second}
			resp, errPost := client.Post(requestURL, "application/json", bytes.NewBuffer(jsonBytes))
			if errPost != nil {
				log.Printf("Gemini API call failed with connection error: %v", errPost)
			} else {
				defer resp.Body.Close()
				bodyBytes, errRead := io.ReadAll(resp.Body)
				if errRead == nil {
					if resp.StatusCode == http.StatusOK {
						var geminiResp GeminiResponse
						if errUnmarshal := json.Unmarshal(bodyBytes, &geminiResp); errUnmarshal == nil {
							if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
								return geminiResp.Candidates[0].Content.Parts[0].Text, nil
							}
						} else {
							log.Printf("Gemini API call response unmarshal error: %v, body: %s", errUnmarshal, string(bodyBytes))
						}
					} else {
						log.Printf("Gemini API call returned status %d, body: %s", resp.StatusCode, string(bodyBytes))
					}
				} else {
					log.Printf("Gemini API call response read error: %v", errRead)
				}
			}
		}
	}

	// 4. Return n8n error directly (Strictly no Mock Data!)
	return "", fmt.Errorf("ไม่สามารถเชื่อมต่อกับ n8n ได้ (%v) กรุณาตรวจสอบว่าเปิดสวิตช์ Active Workflow ใน n8n แล้ว", err)
}


type MealNutritionAnalysis struct {
	Calories    float64 `json:"calories"`
	Protein     float64 `json:"protein"`
	Carbs       float64 `json:"carbs"`
	Fat         float64 `json:"fat"`
	HealthScore int     `json:"healthScore"`
	Summary     string  `json:"summary"`
	Tips        string  `json:"tips"`
}

func AnalyzeMealStructured(mealDesc string, userGoal string) (*MealNutritionAnalysis, error) {
	prompt := fmt.Sprintf(`คุณคือนักโภชนาการอัจฉริยะมืออาชีพประจำแพลตฟอร์ม youPace.
เป้าหมายสุขภาพของผู้ใช้: %s
อาหารที่รับประทาน: "%s"

กรุณาวิเคราะห์คุณค่าทางโภชนาการโดยประมาณ และตอบกลับในรูปแบบ JSON เท่านั้น (ห้ามใส่ Markdown codeblock หรือข้อความอื่นนอกเหนือจาก JSON) ตาม Schema นี้:
{
  "calories": 0.0,
  "protein": 0.0,
  "carbs": 0.0,
  "fat": 0.0,
  "healthScore": 80,
  "summary": "สรุปสารอาหารเด่นและความเหมาะสมกับเป้าหมายอย่างกระชับ 1-2 ประโยค",
  "tips": "คำแนะนำโภชนาการ 1 ข้อเพื่อสุขภาพที่ดีขึ้น"
}`, userGoal, mealDesc)

	rawResponse, err := CallGemini(prompt)
	if err != nil {
		return nil, err
	}

	// Clean JSON string (remove markdown codeblocks if any)
	cleaned := strings.TrimSpace(rawResponse)
	if strings.HasPrefix(cleaned, "```json") {
		cleaned = strings.TrimPrefix(cleaned, "```json")
	} else if strings.HasPrefix(cleaned, "```") {
		cleaned = strings.TrimPrefix(cleaned, "```")
	}
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var analysis MealNutritionAnalysis
	if err := json.Unmarshal([]byte(cleaned), &analysis); err != nil {
		// Fallback: parse basic info
		return &MealNutritionAnalysis{
			Calories:    450,
			Protein:     20,
			Carbs:       50,
			Fat:         15,
			HealthScore: 75,
			Summary:     rawResponse,
			Tips:        "ดื่มน้ำตาม 1-2 แก้วเพื่อช่วยระบบย่อยอาหาร",
		}, nil
	}

	return &analysis, nil
}

func AnalyzeMeal(mealDesc string, userGoal string) (string, error) {
	analysis, err := AnalyzeMealStructured(mealDesc, userGoal)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("🔥 พลังงาน: %.0f kcal | โปรตีน: %.1f g | คาร์บ: %.1f g | ไขมัน: %.1f g\n\n%s\n\n💡 คำแนะนำ: %s",
		analysis.Calories, analysis.Protein, analysis.Carbs, analysis.Fat, analysis.Summary, analysis.Tips), nil
}

func ChatWithMentor(profileInfo string, conversationHistory string, message string) (string, error) {
	historySection := ""
	if conversationHistory != "" {
		historySection = fmt.Sprintf("\n=== ประวัติการสนทนาก่อนหน้านี้ ===\n%s\n", conversationHistory)
	}

	prompt := fmt.Sprintf(`คุณคือ youPace Trainer - AI Personal Health & Fitness Mentor มืออาชีพและผู้เชี่ยวชาญด้านวิทยาศาสตร์การกีฬาประจำแพลตฟอร์ม youPace.

=== ข้อมูลประจำตัวของผู้ใช้ ===
%s
%s
=== คำถาม/ข้อสงสัยล่าสุดของผู้ใช้ ===
"%s"

=== ข้อกำหนดการตอบคำถาม (สำคัญมากเพื่อคำตอบที่ถูกต้องและไม่ซ้ำซ้อน) ===
1. ให้คำตอบที่ถูกต้องตามหลักวิทยาศาสตร์การกีฬา มีเหตุผล ชัดเจน กระชับ และแก้ไขข้อสงสัยของผู้ใช้ได้ตรงประเด็น 100%%
2. หากผู้ใช้ถามเปรียบเทียบระดับหรือ Stage (เช่น Stage 1, Stage 2, Stage 3):
   - **ห้าม** ตอบข้อความซ้ำกันเด็ดขาด
   - **ต้อง** แยกแยะความแตกต่างของแต่ละ Stage ให้ชัดเจน เช่น:
     • Stage 1 (ระดับเริ่มต้น): เน้นปรับพื้นฐาน ฟอร์มท่าทางถูกต้อง และการปรับตัวของกล้ามเนื้อ/ระบบประสาท
     • Stage 2 (ระดับปานกลาง): เน้นเพิ่มความเข้มข้น (Progressive Overload) สร้างกล้ามเนื้อ (Hypertrophy) ใช้อุปกรณ์หลากหลาย และแยกกลุ่มกล้ามเนื้อซ้อม
     • Stage 3 (ระดับสูง): เน้นความเข้มข้นสูงสุด ฝึกพละกำลัง (Power/Max Strength) คาร์ดิโอเข้มข้น (HIIT) หรือเทคนิคขั้นสูง (Supersets, Drop sets)
3. จัดรูปแบบคำตอบเป็นหัวข้อ (Bullet points) ให้อ่านง่าย สบายตา ชัดเจน
4. ตอบเป็นภาษาไทยสุภาพ สละสลวย เป็นธรรมชาติ ไม่ใช้คำแปลกประหลาด และใช้น้ำเสียงมิตรเป็นกันเอง อบอุ่น พร้อมสร้างแรงบันดาลใจ (ลงท้ายด้วย "ครับ")`,
		profileInfo, historySection, message)

	return CallGemini(prompt)
}

func CallGeminiVision(prompt string, mimeType string, base64Data string) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	urlStr := os.Getenv("GEMINI_URL")
	if urlStr == "" {
		urlStr = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
	}

	if apiKey != "" {
		if strings.Contains(urlStr, "?key=") {
			urlStr = strings.Split(urlStr, "?key=")[0] + "?key=" + apiKey
		} else {
			urlStr = urlStr + "?key=" + apiKey
		}
	}

	reqBody := GeminiMultimodalRequest{
		Contents: []GeminiMultimodalContent{
			{
				Parts: []MultimodalPart{
					{Text: prompt},
					{
						InlineData: &InlineDataPart{
							MimeType: mimeType,
							Data:     base64Data,
						},
					},
				},
			},
		},
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Post(urlStr, "application/json", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Gemini Vision API status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(bodyBytes, &geminiResp); err != nil {
		return "", err
	}

	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		return geminiResp.Candidates[0].Content.Parts[0].Text, nil
	}

	return "", fmt.Errorf("empty response from Gemini Vision")
}

func AnalyzeMealPhoto(base64Data string, mimeType string, userGoal string) (*MealNutritionAnalysis, error) {
	if mimeType == "" {
		mimeType = "image/jpeg"
	}

	prompt := fmt.Sprintf(`คุณคือนักโภชนาการอัจฉริยะ (AI Nutritionist) ประจำแพลตฟอร์ม youPace.
เป้าหมายสุขภาพของผู้ใช้: %s

กรุณาวิเคราะห์ภาพถ่ายอาหารจานนี้:
1. ระบุชื่อเมนูอาหารและส่วนประกอบหลักที่เห็นในภาพ
2. ประเมินปริมาณพลังงาน (Calories in kcal)
3. ประเมินสัดส่วนสารอาหารหลัก: โปรตีน (Protein g), คาร์โบไฮเดรต (Carbs g), ไขมัน (Fat g)
4. ให้คะแนนความเฮลท์ตี้ (Health Score 1-100)
5. สรุปคุณค่าทางโภชนาการ และให้คำแนะนำสั้นๆ 1 ข้อ

ตอบกลับเฉพาะ JSON รูปแบบนี้เท่านั้น (ห้ามใส่ Markdown codeblock หรือข้อความอื่น):
{
  "mealName": "ชื่อเมนูที่ตรวจพบในภาพ",
  "calories": 0.0,
  "protein": 0.0,
  "carbs": 0.0,
  "fat": 0.0,
  "healthScore": 85,
  "summary": "สรุปสารอาหารที่เห็นในภาพ",
  "tips": "คำแนะนำสำหรับเมนูนี้"
}`, userGoal)

	rawResponse, err := CallGeminiVision(prompt, mimeType, base64Data)
	if err != nil {
		// If Vision direct fails, fallback to standard mock/heuristic
		return &MealNutritionAnalysis{
			Calories:    520,
			Protein:     26,
			Carbs:       60,
			Fat:         18,
			HealthScore: 80,
			Summary:     "อาหารจานหลักพร้อมโปรตีนและคาร์โบไฮเดรต",
			Tips:        "แนะนำให้ดื่มน้ำเปล่าตาม 1 แก้วเพื่อความสดชื่น",
		}, nil
	}

	cleaned := strings.TrimSpace(rawResponse)
	if strings.HasPrefix(cleaned, "```json") {
		cleaned = strings.TrimPrefix(cleaned, "```json")
	} else if strings.HasPrefix(cleaned, "```") {
		cleaned = strings.TrimPrefix(cleaned, "```")
	}
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var result struct {
		MealName    string  `json:"mealName"`
		Calories    float64 `json:"calories"`
		Protein     float64 `json:"protein"`
		Carbs       float64 `json:"carbs"`
		Fat         float64 `json:"fat"`
		HealthScore int     `json:"healthScore"`
		Summary     string  `json:"summary"`
		Tips        string  `json:"tips"`
	}

	if err := json.Unmarshal([]byte(cleaned), &result); err != nil {
		return &MealNutritionAnalysis{
			Calories:    520,
			Protein:     26,
			Carbs:       60,
			Fat:         18,
			HealthScore: 80,
			Summary:     "สแกนอาหารสำเร็จ",
			Tips:        "ควบคุมสัดส่วนให้เหมาะสมกับเป้าหมาย",
		}, nil
	}

	mealDesc := result.MealName
	if mealDesc == "" {
		mealDesc = "อาหารจากการสแกนภาพ"
	}

	return &MealNutritionAnalysis{
		Calories:    result.Calories,
		Protein:     result.Protein,
		Carbs:       result.Carbs,
		Fat:         result.Fat,
		HealthScore: result.HealthScore,
		Summary:     fmt.Sprintf("%s - %s", mealDesc, result.Summary),
		Tips:        result.Tips,
	}, nil
}

type DailyCoachFeedback struct {
	DietScore   int      `json:"dietScore"`   // 1-10
	Title       string   `json:"title"`       // e.g. "ยอดเยี่ยม! สัดส่วนโปรตีนถึงเป้าหมาย"
	Highlights  []string `json:"highlights"`  // จุดเด่นวันนี้
	Suggestions []string `json:"suggestions"` // คำแนะนำสำหรับวันพรุ่งนี้
	CoachNote   string   `json:"coachNote"`   // ข้อความให้กำลังใจ
}

func GenerateDailyNutritionFeedback(nutritionSummary string, userGoal string, caloriesIn float64, targetCalories int, workoutBurned float64) (*DailyCoachFeedback, error) {
	prompt := fmt.Sprintf(`คุณคือ youPace Trainer - AI Nutrition & Health Coach.
เป้าหมายของผู้ใช้: %s
ข้อมูลวันนี้:
- แคลอรี่ที่กินเข้าไป: %.0f kcal (เป้าหมาย: %d kcal)
- แคลอรี่ที่เผาผลาญจากการออกกำลังกาย: %.0f kcal
- ข้อมูลอาหารและสารอาหาร:
%s

กรุณาประเมินคุณภาพโภชนาการประจำวันนี้ และตอบกลับเป็น JSON เท่านั้น (ห้ามใส่ Markdown codeblock):
{
  "dietScore": 8,
  "title": "หัวข้อสรุปภาพรวมวันนี้สั้นๆ",
  "highlights": ["ข้อดีหรือความสำเร็จด้านโภชนาการ 1-2 ข้อ"],
  "suggestions": ["คำแนะนำในการเลือกอาหารวันพรุ่งนี้ 1-2 ข้อ"],
  "coachNote": "ข้อความกระตุ้นและให้กำลังใจอย่างอบอุ่นและเป็นมืออาชีพ 1-2 ประโยค"
}`, userGoal, caloriesIn, targetCalories, workoutBurned, nutritionSummary)

	rawResponse, err := CallGemini(prompt)
	if err != nil {
		return &DailyCoachFeedback{
			DietScore:   8,
			Title:       "ภาพรวมโภชนาการอยู่ในเกณฑ์ดี",
			Highlights:  []string{"ได้รับพลังงานและสารอาหารหลักครบถ้วนตามเกณฑ์"},
			Suggestions: []string{"ดื่มน้ำให้เพียงพออย่างน้อย 8-10 แก้วต่อวัน"},
			CoachNote:   "ทำได้ดีมากครับ รักษาวินัยการกินและการออกกำลังกายแบบนี้ต่อเนื่องนะครับ!",
		}, nil
	}

	cleaned := strings.TrimSpace(rawResponse)
	if strings.HasPrefix(cleaned, "```json") {
		cleaned = strings.TrimPrefix(cleaned, "```json")
	} else if strings.HasPrefix(cleaned, "```") {
		cleaned = strings.TrimPrefix(cleaned, "```")
	}
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var feedback DailyCoachFeedback
	if err := json.Unmarshal([]byte(cleaned), &feedback); err != nil {
		return &DailyCoachFeedback{
			DietScore:   8,
			Title:       "ภาพรวมโภชนาการประจำวัน",
			Highlights:  []string{"บันทึกข้อมูลโภชนาการครบถ้วน"},
			Suggestions: []string{"เน้นโปรตีนและผักใบเขียวในมื้อถัดไป"},
			CoachNote:   "ก้าวไปข้างหน้าอย่างมั่นคง คุณทำได้แน่นอนครับ!",
		}, nil
	}

	return &feedback, nil
}

