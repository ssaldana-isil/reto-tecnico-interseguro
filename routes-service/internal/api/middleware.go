package api

import (
	"net/http"
	"slices"
	"strings"

	"github.com/ssaldana/routes-service/internal/auth"
)

// maxBodyBytes limita el cuerpo de cada petición (grafo incluido) a 1 MB.
const maxBodyBytes = 1 << 20

// cors permite los orígenes de cfg.CORSOrigins: "*" abre a todos; si no, se refleja el Origin
// solo cuando está en la lista. Sin orígenes configurados no se emite Access-Control-Allow-Origin.
func cors(cfg Config, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if slices.Contains(cfg.CORSOrigins, "*") {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else if origin := r.Header.Get("Origin"); origin != "" && slices.Contains(cfg.CORSOrigins, origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		next(w, r)
	}
}

func limitBody(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
		next(w, r)
	}
}

func withJWT(cfg Config, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "se requiere Authorization: Bearer <token>", Code: "UNAUTHORIZED"})
			return
		}
		if _, err := auth.Verify(cfg.JWTSecret, strings.TrimPrefix(h, "Bearer ")); err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: err.Error(), Code: "UNAUTHORIZED"})
			return
		}
		next(w, r)
	}
}
