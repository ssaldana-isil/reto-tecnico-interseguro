package auth

import (
	"errors"
	"testing"
	"time"
)

func TestIssueYVerify(t *testing.T) {
	secret := []byte("secreto-de-prueba")
	tok, err := Issue(secret, "frontend", time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	sub, err := Verify(secret, tok)
	if err != nil || sub != "frontend" {
		t.Fatalf("esperaba sub=frontend, obtuve %q (err %v)", sub, err)
	}
}

func TestVerify_FirmaInvalida(t *testing.T) {
	tok, _ := Issue([]byte("secreto-A"), "x", time.Minute)
	if _, err := Verify([]byte("secreto-B"), tok); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("esperaba ErrInvalidToken, obtuve %v", err)
	}
}

func TestVerify_Expirado(t *testing.T) {
	secret := []byte("s")
	tok, _ := Issue(secret, "x", -time.Minute)
	if _, err := Verify(secret, tok); !errors.Is(err, ErrExpiredToken) {
		t.Fatalf("esperaba ErrExpiredToken, obtuve %v", err)
	}
}
