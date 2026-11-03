package handlers

import (
	"encoding/base64"
	"strings"
	"testing"
)

func TestValidateMealPhoto(t *testing.T) {
	ok := base64.StdEncoding.EncodeToString([]byte("fake-image-bytes"))
	big := base64.StdEncoding.EncodeToString(make([]byte, maxMealPhotoBytes+1))

	tests := []struct {
		name     string
		req      MealPhotoAnalysisRequest
		wantMime string
		wantErr  string
	}{
		{"plain base64 defaults to jpeg", MealPhotoAnalysisRequest{ImageData: ok}, "image/jpeg", ""},
		{"explicit png", MealPhotoAnalysisRequest{ImageData: ok, MimeType: "image/png"}, "image/png", ""},
		{"data URL supplies mime", MealPhotoAnalysisRequest{ImageData: "data:image/webp;base64," + ok}, "image/webp", ""},
		{"unsupported type", MealPhotoAnalysisRequest{ImageData: ok, MimeType: "application/pdf"}, "", "unsupported image type"},
		{"invalid base64", MealPhotoAnalysisRequest{ImageData: "***not base64***"}, "", "not valid base64"},
		{"too large", MealPhotoAnalysisRequest{ImageData: big}, "", "too large"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			b64, mime, err := validateMealPhoto(tc.req)
			if tc.wantErr != "" {
				if err == nil || !strings.Contains(err.Error(), tc.wantErr) {
					t.Fatalf("want error containing %q, got %v", tc.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if mime != tc.wantMime {
				t.Errorf("mime = %q, want %q", mime, tc.wantMime)
			}
			if b64 != ok {
				t.Errorf("data URL prefix was not stripped")
			}
		})
	}
}
