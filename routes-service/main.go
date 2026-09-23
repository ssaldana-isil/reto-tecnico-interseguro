// routes-service — Servicio de Rutas Óptimas para asignación de grúas.
// Iniciativa Evolution (Atención de Siniestros).
package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/ssaldana/routes-service/internal/api"
	"github.com/ssaldana/routes-service/internal/service"
)

func main() {
	cfg, port, err := loadConfig(os.Getenv)
	if err != nil {
		log.Fatalf("configuración inválida: %v", err)
	}
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           api.NewMux(cfg, service.NewRouteService()),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	log.Printf("routes-service escuchando en :%s", port)
	log.Fatal(srv.ListenAndServe())
}
