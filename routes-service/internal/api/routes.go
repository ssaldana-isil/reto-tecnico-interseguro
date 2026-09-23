// Package api expone el servicio HTTP versionado (/v1) del cálculo de rutas.
package api

import (
	"net/http"
	"time"

	"github.com/ssaldana/routes-service/internal/service"
)

// Config del servidor: secreto JWT, credenciales del cliente y orígenes CORS permitidos.
type Config struct {
	JWTSecret    []byte
	ClientID     string
	ClientSecret string
	TokenTTL     time.Duration
	CORSOrigins  []string
}

// NewMux construye el router versionado con CORS, límite de tamaño, auth y handlers.
// El servicio de rutas se inyecta para desacoplar la capa HTTP del algoritmo.
func NewMux(cfg Config, svc service.RouteService) *http.ServeMux {
	routes := &routeController{svc: svc}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/auth/token", cors(cfg, limitBody(tokenHandler(cfg))))
	mux.HandleFunc("POST /v1/routes/optimal", cors(cfg, limitBody(withJWT(cfg, routes.optimal))))
	mux.HandleFunc("GET /v1/health", cors(cfg, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}))
	mux.HandleFunc("OPTIONS /", cors(cfg, func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	return mux
}
