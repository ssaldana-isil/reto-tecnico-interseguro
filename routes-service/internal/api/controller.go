package api

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/ssaldana/routes-service/internal/auth"
	"github.com/ssaldana/routes-service/internal/graph"
	"github.com/ssaldana/routes-service/internal/service"
)

// routeController atiende el cálculo de rutas; depende de la interfaz RouteService.
type routeController struct {
	svc service.RouteService
}

// decodeBody lee el JSON del cuerpo. Responde 413 si supera maxBodyBytes o 400 con badRequest si es inválido.
func decodeBody(w http.ResponseWriter, r *http.Request, v any, badRequest string) bool {
	err := json.NewDecoder(r.Body).Decode(v)
	var tooLarge *http.MaxBytesError
	switch {
	case errors.As(err, &tooLarge):
		writeJSON(w, http.StatusRequestEntityTooLarge, errorResponse{Error: "el cuerpo supera el máximo de 1 MB", Code: "PAYLOAD_TOO_LARGE"})
		return false
	case err != nil:
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: badRequest, Code: "BAD_REQUEST"})
		return false
	}
	return true
}

// equal compara en tiempo constante para no filtrar información por el tiempo de respuesta.
func equal(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

func tokenHandler(cfg Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req tokenRequest
		if !decodeBody(w, r, &req, "cuerpo inválido") {
			return
		}
		if !equal(req.ClientID, cfg.ClientID) || !equal(req.ClientSecret, cfg.ClientSecret) {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "credenciales inválidas", Code: "UNAUTHORIZED"})
			return
		}
		tok, err := auth.Issue(cfg.JWTSecret, req.ClientID, cfg.TokenTTL)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "no se pudo emitir el token", Code: "INTERNAL"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"accessToken": tok, "tokenType": "Bearer", "expiresIn": int(cfg.TokenTTL.Seconds())})
	}
}

func (c *routeController) optimal(w http.ResponseWriter, r *http.Request) {
	var req routeRequest
	if !decodeBody(w, r, &req, "cuerpo inválido: se espera accidentLocation, depots y graph") {
		return
	}
	if req.AccidentLocation == "" || len(req.Graph) == 0 {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "accidentLocation y graph son obligatorios", Code: "VALIDATION"})
		return
	}
	route, err := c.svc.OptimalRoute(req.Graph, req.AccidentLocation, req.Depots)
	switch {
	case errors.Is(err, graph.ErrUnreachable):
		writeJSON(w, http.StatusUnprocessableEntity, errorResponse{Error: err.Error(), Code: "UNREACHABLE"})
	case errors.Is(err, graph.ErrUnknownNode), errors.Is(err, graph.ErrUnknownDepot),
		errors.Is(err, graph.ErrNoDepots), errors.Is(err, graph.ErrNegativeWeight):
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error(), Code: "VALIDATION"})
	case err != nil:
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error interno", Code: "INTERNAL"})
	default:
		writeJSON(w, http.StatusOK, route)
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
