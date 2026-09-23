// Package service expone los casos de uso del cálculo de rutas a la capa HTTP.
package service

import "github.com/ssaldana/routes-service/internal/graph"

// RouteService calcula la ruta óptima entre la base más cercana y el accidente.
type RouteService interface {
	OptimalRoute(g graph.Graph, accident string, depots []string) (*graph.Route, error)
}

type routeService struct{}

// NewRouteService devuelve la implementación basada en el paquete graph (Dijkstra).
func NewRouteService() RouteService {
	return routeService{}
}

func (routeService) OptimalRoute(g graph.Graph, accident string, depots []string) (*graph.Route, error) {
	return graph.OptimalRoute(g, accident, depots)
}
