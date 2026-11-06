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
	return postJSONWithHeaders(client, url, nil, body, attempts)
}

// postJSONWithHeaders is postJSONWithRetry with extra request headers (API keys, auth).
func postJSONWithHeaders(client *http.Client, url string, headers map[string]string, body []byte, attempts int) (int, []byte, error) {
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
		var req *http.Request
		req, err = http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
		if err != nil {
			return 0, nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		for k, v := range headers {
			req.Header.Set(k, v)
		}
		var resp *http.Response
		resp, err = client.Do(req)
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
