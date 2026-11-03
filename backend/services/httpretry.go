package services

import (
	"bytes"
	"io"
	"net/http"
	"time"
)

// retryBaseDelay is the first backoff step; tests shrink it.
var retryBaseDelay = 500 * time.Millisecond

// postJSONWithRetry POSTs a JSON body and retries on network errors, 429 and
// 5xx responses with exponential backoff. It returns the final status and body.
func postJSONWithRetry(client *http.Client, url string, body []byte, attempts int) (int, []byte, error) {
	var (
		status  int
		payload []byte
		err     error
	)
	delay := retryBaseDelay
	for i := 0; i < attempts; i++ {
		if i > 0 {
			time.Sleep(delay)
			delay *= 2
		}
		var resp *http.Response
		resp, err = client.Post(url, "application/json", bytes.NewReader(body))
		if err != nil {
			continue
		}
		payload, err = io.ReadAll(resp.Body)
		resp.Body.Close()
		status = resp.StatusCode
		if err != nil {
			continue
		}
		if status == http.StatusTooManyRequests || status >= 500 {
			continue
		}
		return status, payload, nil
	}
	return status, payload, err
}
