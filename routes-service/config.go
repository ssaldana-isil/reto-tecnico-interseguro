package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/ssaldana/routes-service/internal/api"
)

// loadConfig lee la configuración del entorno. Falla si falta algún secreto: no hay valores por defecto.
func loadConfig(getenv func(string) string) (api.Config, string, error) {
	var missing []string
	for _, key := range []string{"JWT_SECRET", "CLIENT_ID", "CLIENT_SECRET"} {
		if getenv(key) == "" {
			missing = append(missing, key)
		}
	}
	if len(missing) > 0 {
		return api.Config{}, "", fmt.Errorf("faltan variables de entorno obligatorias: %s", strings.Join(missing, ", "))
	}

	port := getenv("PORT") // Render inyecta PORT
	if port == "" {
		port = "8080"
	}
	cors := getenv("CORS_ORIGIN")
	if cors == "" {
		cors = "*"
	}
	var origins []string
	for _, origin := range strings.Split(cors, ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			origins = append(origins, origin)
		}
	}

	return api.Config{
		JWTSecret:    []byte(getenv("JWT_SECRET")),
		ClientID:     getenv("CLIENT_ID"),
		ClientSecret: getenv("CLIENT_SECRET"),
		TokenTTL:     time.Hour,
		CORSOrigins:  origins,
	}, port, nil
}
