package main

import (
	"reflect"
	"testing"
)

func TestAllowedOrigins(t *testing.T) {
	t.Setenv("FRONTEND_URL", "")
	if got := allowedOrigins(); !reflect.DeepEqual(got, []string{"*"}) {
		t.Errorf("unset FRONTEND_URL = %v, want [*]", got)
	}

	t.Setenv("FRONTEND_URL", "https://a.example.com/, https://b.example.com ,")
	got := allowedOrigins()
	want := []string{"http://localhost:3000", "http://localhost:5173", "https://a.example.com", "https://b.example.com"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
}
