package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"youpace/config"
	"youpace/models"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

const (
	GoogleClientID     = "YOUR_GOOGLE_CLIENT_ID_PLACEHOLDER"
	GoogleClientSecret = "YOUR_GOOGLE_CLIENT_SECRET_PLACEHOLDER"
)

// GetClientID returns the client ID from environment or fallback
func GetClientID() string {
	if id := os.Getenv("GOOGLE_CLIENT_ID"); id != "" {
		return id
	}
	return GoogleClientID
}

// GetClientSecret returns the client secret from environment or fallback
func GetClientSecret() string {
	if secret := os.Getenv("GOOGLE_CLIENT_SECRET"); secret != "" {
		return secret
	}
	return GoogleClientSecret
}

// GetRedirectURI returns redirect URI for OAuth2 callback
func GetRedirectURI(c echo.Context) string {
	if uri := os.Getenv("GOOGLE_REDIRECT_URI"); uri != "" {
		return uri
	}
	// Fallback to request host port but default to docker external port 8081 if not clear
	scheme := "http"
	if c.Scheme() != "" {
		scheme = c.Scheme()
	}

	// Default redirect to port 8081 where external users access docker-compose backend
	host := c.Request().Host
	// If local runs on 8080, adjust or stick to standard 8081 redirect
	if host == "localhost:8080" {
		return fmt.Sprintf("%s://localhost:8080/api/calendar/callback", scheme)
	}
	return fmt.Sprintf("%s://%s/api/calendar/callback", scheme, "localhost:8081")
}

// GetFrontendURL returns the frontend redirect url after callback
func GetFrontendURL() string {
	if uri := os.Getenv("FRONTEND_URL"); uri != "" {
		return uri
	}
	return "http://localhost:3000"
}

// GetGoogleAuthURL generates the consent page URL
func GetGoogleAuthURL(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	clientID := GetClientID()
	redirectURI := GetRedirectURI(c)
	scope := "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"

	authURL := fmt.Sprintf(
		"https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=%s&access_type=offline&prompt=consent&state=%s",
		url.QueryEscape(clientID),
		url.QueryEscape(redirectURI),
		url.QueryEscape(scope),
		url.QueryEscape(userID.String()),
	)

	return c.JSON(http.StatusOK, map[string]string{"authUrl": authURL})
}

// GoogleCalendarCallback handles redirect back from google
func GoogleCalendarCallback(c echo.Context) error {
	code := c.QueryParam("code")
	state := c.QueryParam("state") // state stores our UserID

	if code == "" || state == "" {
		return c.Redirect(http.StatusFound, GetFrontendURL()+"?calendar_error=missing_params")
	}

	userID, err := uuid.Parse(state)
	if err != nil {
		return c.Redirect(http.StatusFound, GetFrontendURL()+"?calendar_error=invalid_user_id")
	}

	// Exchange Authorization Code for Token
	tokenURL := "https://oauth2.googleapis.com/token"
	data := url.Values{}
	data.Set("code", code)
	data.Set("client_id", GetClientID())
	data.Set("client_secret", GetClientSecret())
	data.Set("redirect_uri", GetRedirectURI(c))
	data.Set("grant_type", "authorization_code")

	resp, err := http.PostForm(tokenURL, data)
	if err != nil {
		log.Printf("Google Token Exchange error: %v", err)
		return c.Redirect(http.StatusFound, GetFrontendURL()+"?calendar_error=token_exchange_failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("Google OAuth token exchange failed with code %d. Body: %s", resp.StatusCode, string(bodyBytes))
		return c.Redirect(http.StatusFound, GetFrontendURL()+"?calendar_error=invalid_response")
	}

	var tokenResp struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int    `json:"expires_in"`
		TokenType    string `json:"token_type"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return c.Redirect(http.StatusFound, GetFrontendURL()+"?calendar_error=parse_failed")
	}

	expiry := time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)

	// Save or Update Token in DB
	var googleToken models.UserGoogleToken
	dbErr := config.DB.Where("user_id = ?", userID).First(&googleToken).Error

	if dbErr != nil {
		// Create new token
		googleToken = models.UserGoogleToken{
			UserID:       userID,
			AccessToken:  tokenResp.AccessToken,
			RefreshToken: tokenResp.RefreshToken,
			Expiry:       expiry,
			TokenType:    tokenResp.TokenType,
		}
		if err := config.DB.Create(&googleToken).Error; err != nil {
			log.Printf("Error saving google token to DB: %v", err)
			return c.Redirect(http.StatusFound, GetFrontendURL()+"?calendar_error=db_error")
		}
	} else {
		// Update existing token
		googleToken.AccessToken = tokenResp.AccessToken
		googleToken.Expiry = expiry
		googleToken.TokenType = tokenResp.TokenType
		// Only update refresh token if Google returned one (offline access)
		if tokenResp.RefreshToken != "" {
			googleToken.RefreshToken = tokenResp.RefreshToken
		}
		if err := config.DB.Save(&googleToken).Error; err != nil {
			log.Printf("Error updating google token in DB: %v", err)
			return c.Redirect(http.StatusFound, GetFrontendURL()+"?calendar_error=db_error")
		}
	}

	// Redirect back to frontend dashboard with success flag
	return c.Redirect(http.StatusFound, GetFrontendURL()+"?google-calendar=connected")
}

// GetCalendarStatus checks if user is connected
func GetCalendarStatus(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	var count int64
	config.DB.Model(&models.UserGoogleToken{}).Where("user_id = ?", userID).Count(&count)

	return c.JSON(http.StatusOK, map[string]interface{}{"connected": count > 0})
}

// DisconnectCalendar deletes google token
func DisconnectCalendar(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	if err := config.DB.Where("user_id = ?", userID).Delete(&models.UserGoogleToken{}).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to disconnect calendar"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "disconnected successfully"})
}

// RefreshGoogleToken refreshes the access token using refresh token
func RefreshGoogleToken(token *models.UserGoogleToken) error {
	tokenURL := "https://oauth2.googleapis.com/token"
	data := url.Values{}
	data.Set("client_id", GetClientID())
	data.Set("client_secret", GetClientSecret())
	data.Set("refresh_token", token.RefreshToken)
	data.Set("grant_type", "refresh_token")

	resp, err := http.PostForm(tokenURL, data)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("google token refresh failed: status %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	var refreshResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		TokenType   string `json:"token_type"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&refreshResp); err != nil {
		return err
	}

	token.AccessToken = refreshResp.AccessToken
	token.Expiry = time.Now().Add(time.Duration(refreshResp.ExpiresIn) * time.Second)
	if refreshResp.TokenType != "" {
		token.TokenType = refreshResp.TokenType
	}

	return config.DB.Save(token).Error
}

// GetGoogleCalendarEvents fetches user events for the next 7 days
func GetGoogleCalendarEvents(c echo.Context) error {
	userID, err := ExtractUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	var googleToken models.UserGoogleToken
	if err := config.DB.Where("user_id = ?", userID).First(&googleToken).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "google calendar not connected"})
	}

	// Check if token is expired, if so refresh it
	// Refresh if expires in less than 60 seconds
	if time.Now().Add(60 * time.Second).After(googleToken.Expiry) {
		log.Println("Google Access Token expired, refreshing...")
		if err := RefreshGoogleToken(&googleToken); err != nil {
			log.Printf("Failed to refresh google token: %v", err)
			return c.JSON(http.StatusForbidden, map[string]string{"error": "google calendar token expired, please reconnect"})
		}
	}

	// Fetch Events
	timeMin := time.Now().Format(time.RFC3339)
	timeMax := time.Now().AddDate(0, 0, 7).Format(time.RFC3339)

	apiURL := fmt.Sprintf(
		"https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=%s&timeMax=%s&singleEvents=true&orderBy=startTime",
		url.QueryEscape(timeMin),
		url.QueryEscape(timeMax),
	)

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to create calendar api request"})
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", googleToken.AccessToken))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to fetch calendar events"})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("Google Calendar API error: code %d, body: %s", resp.StatusCode, string(bodyBytes))
		return c.JSON(resp.StatusCode, map[string]string{"error": "failed to load events from google calendar"})
	}

	// Parse events and send back
	var eventsResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&eventsResp); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to parse calendar events"})
	}

	if items, ok := eventsResp["items"].([]interface{}); ok {
		rawItems := []map[string]interface{}{}
		for _, item := range items {
			if itemMap, isMap := item.(map[string]interface{}); isMap {
				rawItems = append(rawItems, itemMap)
			}
		}
		go SyncGoogleCalendarWorkouts(userID, rawItems)
	}

	return c.JSON(http.StatusOK, eventsResp)
}

func SyncGoogleCalendarWorkouts(userID uuid.UUID, items []map[string]interface{}) {
	var exercises []models.Exercise
	config.DB.Find(&exercises)

	for _, item := range items {
		summary, _ := item["summary"].(string)
		if summary == "" {
			continue
		}

		if !strings.Contains(strings.ToLower(summary), "yourpaceevent") {
			continue
		}

		cleanTitle := strings.TrimSpace(strings.ReplaceAll(summary, "(YourPaceEvent)", ""))
		cleanTitle = strings.TrimSpace(strings.ReplaceAll(cleanTitle, "(yourPaceEvent)", ""))
		if cleanTitle == "" {
			cleanTitle = summary
		}

		startMap, _ := item["start"].(map[string]interface{})
		endMap, _ := item["end"].(map[string]interface{})

		dateTimeStr, _ := startMap["dateTime"].(string)
		dateStr, _ := startMap["date"].(string)

		workoutDate := time.Now()
		durationMins := 30

		if dateTimeStr != "" {
			if t, err := time.Parse(time.RFC3339, dateTimeStr); err == nil {
				workoutDate = t
			}
		} else if dateStr != "" {
			if t, err := time.Parse("2006-01-02", dateStr); err == nil {
				workoutDate = t
			}
		}

		endDateTimeStr, _ := endMap["dateTime"].(string)
		if dateTimeStr != "" && endDateTimeStr != "" {
			t1, err1 := time.Parse(time.RFC3339, dateTimeStr)
			t2, err2 := time.Parse(time.RFC3339, endDateTimeStr)
			if err1 == nil && err2 == nil && t2.After(t1) {
				durationMins = int(t2.Sub(t1).Minutes())
			}
		}

		var existing models.WorkoutSchedule
		err := config.DB.Where("user_id = ? AND title = ? AND scheduled_date = ?", userID, cleanTitle, workoutDate.Format("2006-01-02")).First(&existing).Error
		if err != nil {
			selectedEx := []models.Exercise{}
			var totalBurnRate float64 = 0.0
			for i := 0; i < 3 && i < len(exercises); i++ {
				selectedEx = append(selectedEx, exercises[i])
				if exercises[i].BurnRate > 0 {
					totalBurnRate += exercises[i].BurnRate
				}
			}

			var avgBurnRate float64 = 6.5
			if len(selectedEx) > 0 && totalBurnRate > 0 {
				avgBurnRate = totalBurnRate / float64(len(selectedEx))
			}
			estimatedBurnedCalories := float64(durationMins) * avgBurnRate

			schedule := models.WorkoutSchedule{
				UserID:          userID,
				Title:           cleanTitle,
				ScheduledDate:   workoutDate,
				DurationMinutes: durationMins,
				Status:          "PENDING",
				TargetIntensity: "MODERATE",
				BurnedCalories:  estimatedBurnedCalories,
			}

			if err := config.DB.Create(&schedule).Error; err == nil {
				for _, ex := range selectedEx {
					detail := models.WorkoutScheduleDetail{
						WorkoutScheduleID: schedule.ScheduleID,
						ExerciseID:        ex.ExerciseID,
						Sets:              3,
						Reps:              12,
						DurationSeconds:   45,
					}
					config.DB.Create(&detail)
				}
			}
		}
	}
}

// CreateGoogleCalendarWorkoutEvent creates a workout schedule event on the user's primary Google Calendar
func CreateGoogleCalendarWorkoutEvent(userID uuid.UUID, title string, scheduledDate time.Time, durationMinutes int, burnedCalories float64, notes string) error {
	var googleToken models.UserGoogleToken
	if err := config.DB.Where("user_id = ?", userID).First(&googleToken).Error; err != nil {
		log.Printf("CreateGoogleCalendarWorkoutEvent: User %s has not connected Google Calendar, skipping", userID)
		return nil
	}

	if time.Now().After(googleToken.Expiry) {
		if err := RefreshGoogleToken(&googleToken); err != nil {
			log.Printf("Failed to refresh google token for calendar event creation: %v", err)
			return err
		}
	}

	if durationMinutes <= 0 {
		durationMinutes = 30
	}

	// Ensure Bangkok / Local Location (+07:00)
	loc, errLoc := time.LoadLocation("Asia/Bangkok")
	if errLoc != nil {
		loc = time.FixedZone("ICT", 7*3600)
	}

	startTime := scheduledDate.In(loc)
	if startTime.Hour() == 0 && startTime.Minute() == 0 && startTime.Second() == 0 {
		now := time.Now().In(loc)
		startTime = time.Date(startTime.Year(), startTime.Month(), startTime.Day(), now.Hour(), now.Minute(), 0, 0, loc)
	}
	endTime := startTime.Add(time.Duration(durationMinutes) * time.Minute)

	cleanTitle := strings.TrimSpace(title)
	if !strings.Contains(strings.ToLower(cleanTitle), "yourpaceevent") {
		cleanTitle = fmt.Sprintf("%s (YourPaceEvent)", cleanTitle)
	}

	description := fmt.Sprintf("✅ บันทึกกิจกรรมการออกกำลังกายจาก yourPace\n⏱️ ระยะเวลา: %d นาที\n🔥 เผาผลาญประมาณ: %.0f kcal", durationMinutes, burnedCalories)
	if notes != "" {
		description += fmt.Sprintf("\n📝 บันทึกเพิ่มเติม: %s", notes)
	}

	eventPayload := map[string]interface{}{
		"summary":     cleanTitle,
		"description": description,
		"start": map[string]string{
			"dateTime": startTime.Format(time.RFC3339),
			"timeZone": "Asia/Bangkok",
		},
		"end": map[string]string{
			"dateTime": endTime.Format(time.RFC3339),
			"timeZone": "Asia/Bangkok",
		},
	}

	payloadBytes, err := json.Marshal(eventPayload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", "https://www.googleapis.com/calendar/v3/calendars/primary/events", strings.NewReader(string(payloadBytes)))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", googleToken.AccessToken))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("CreateGoogleCalendarWorkoutEvent request error: %v", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("Google Calendar API create event failed: status %d, body: %s", resp.StatusCode, string(bodyBytes))
		return fmt.Errorf("google calendar api error: status %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	log.Printf("Successfully created Google Calendar event: %s for user %s", cleanTitle, userID)
	return nil
}
