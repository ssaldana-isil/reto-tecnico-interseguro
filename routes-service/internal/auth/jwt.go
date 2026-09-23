// Package auth implementa emisión y verificación de JWT HS256
// usando solo la biblioteca estándar (sin dependencias externas).
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrInvalidToken = errors.New("token inválido")
	ErrExpiredToken = errors.New("token expirado")
)

type claims struct {
	Sub string `json:"sub"`
	Iss string `json:"iss"`
	Exp int64  `json:"exp"`
	Iat int64  `json:"iat"`
}

func b64(data []byte) string { return base64.RawURLEncoding.EncodeToString(data) }

func sign(unsigned string, secret []byte) string {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(unsigned))
	return b64(mac.Sum(nil))
}

// Issue emite un token HS256 para el cliente indicado con TTL dado.
func Issue(secret []byte, subject string, ttl time.Duration) (string, error) {
	header := b64([]byte(`{"alg":"HS256","typ":"JWT"}`))
	now := time.Now()
	payload, err := json.Marshal(claims{Sub: subject, Iss: "routes-service", Iat: now.Unix(), Exp: now.Add(ttl).Unix()})
	if err != nil {
		return "", err
	}
	unsigned := header + "." + b64(payload)
	return unsigned + "." + sign(unsigned, secret), nil
}

// Verify valida firma y expiración; devuelve el subject si el token es válido.
func Verify(secret []byte, token string) (string, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return "", ErrInvalidToken
	}
	unsigned := parts[0] + "." + parts[1]
	expected := sign(unsigned, secret)
	if !hmac.Equal([]byte(expected), []byte(parts[2])) {
		return "", ErrInvalidToken
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("%w: payload ilegible", ErrInvalidToken)
	}
	var c claims
	if err := json.Unmarshal(raw, &c); err != nil {
		return "", fmt.Errorf("%w: claims ilegibles", ErrInvalidToken)
	}
	if time.Now().Unix() >= c.Exp {
		return "", ErrExpiredToken
	}
	return c.Sub, nil
}
