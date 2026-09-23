// Package graph implementa el cálculo de rutas óptimas sobre un grafo
// de distritos (nodos) y distancias (pesos). Solo biblioteca estándar.
package graph

import (
	"container/heap"
	"errors"
	"fmt"
	"math"
	"sort"
)

// Graph representa la red de distritos: adyacencia con pesos positivos.
type Graph map[string]map[string]float64

// Route es el resultado del cálculo: base elegida, destino, camino y distancia.
type Route struct {
	FromDepot string   `json:"fromDepot"`
	To        string   `json:"to"`
	Path      []string `json:"path"`
	Distance  float64  `json:"distance"`
}

// Errores controlados del dominio.
var (
	ErrUnreachable    = errors.New("el distrito del accidente no es alcanzable desde ninguna base")
	ErrUnknownNode    = errors.New("el distrito del accidente no existe en el grafo")
	ErrUnknownDepot   = errors.New("la base de grúas no existe en el grafo")
	ErrNoDepots       = errors.New("se requiere al menos una base de grúas (depots)")
	ErrNegativeWeight = errors.New("las distancias del grafo deben ser positivas")
)

// virtualSource es el nodo origen artificial conectado con peso 0 a todas las bases.
const virtualSource = "\x00virtual-source"

// item es un elemento de la cola de prioridad.
// rank desempata distancias iguales: índice de la base de origen en el request.
type item struct {
	node string
	dist float64
	rank int
}

type priorityQueue []item

func (pq priorityQueue) Len() int { return len(pq) }
func (pq priorityQueue) Less(i, j int) bool {
	if pq[i].dist != pq[j].dist {
		return pq[i].dist < pq[j].dist
	}
	return pq[i].rank < pq[j].rank
}
func (pq priorityQueue) Swap(i, j int)       { pq[i], pq[j] = pq[j], pq[i] }
func (pq *priorityQueue) Push(x interface{}) { *pq = append(*pq, x.(item)) }
func (pq *priorityQueue) Pop() interface{} {
	old := *pq
	n := len(old)
	it := old[n-1]
	*pq = old[:n-1]
	return it
}

// Dijkstra calcula distancias mínimas y predecesores desde un origen.
// Devuelve mapas de distancia y predecesor para reconstruir caminos.
func Dijkstra(g Graph, source string) (map[string]float64, map[string]string, error) {
	return dijkstra(g, source, nil)
}

// dijkstra es el núcleo del algoritmo. seedRank asigna el rank a los vecinos
// directos del origen (las bases); el resto de nodos hereda el rank de su predecesor.
// Con seedRank nil todos los ranks son 0 y el desempate queda solo por distancia.
func dijkstra(g Graph, source string, seedRank map[string]int) (map[string]float64, map[string]string, error) {
	dist := make(map[string]float64, len(g))
	prev := make(map[string]string, len(g))
	rank := make(map[string]int, len(g))
	for node := range g {
		dist[node] = math.Inf(1)
	}
	// El origen puede ser un nodo solo referenciado como vecino.
	dist[source] = 0

	pq := &priorityQueue{{node: source, dist: 0}}
	heap.Init(pq)
	visited := make(map[string]bool)

	for pq.Len() > 0 {
		cur := heap.Pop(pq).(item)
		if visited[cur.node] {
			continue
		}
		visited[cur.node] = true
		for _, neighbor := range sortedNeighbors(g[cur.node]) {
			w := g[cur.node][neighbor]
			if w < 0 {
				return nil, nil, ErrNegativeWeight
			}
			if _, ok := dist[neighbor]; !ok {
				dist[neighbor] = math.Inf(1)
			}
			r := cur.rank
			if cur.node == source && seedRank != nil {
				r = seedRank[neighbor]
			}
			alt := cur.dist + w
			if alt < dist[neighbor] || (alt == dist[neighbor] && !visited[neighbor] && r < rank[neighbor]) {
				dist[neighbor] = alt
				prev[neighbor] = cur.node
				rank[neighbor] = r
				heap.Push(pq, item{node: neighbor, dist: alt, rank: r})
			}
		}
	}
	return dist, prev, nil
}

// sortedNeighbors devuelve los vecinos en orden alfabético para que los empates
// se resuelvan siempre igual (la iteración de un map en Go es aleatoria).
func sortedNeighbors(adj map[string]float64) []string {
	names := make([]string, 0, len(adj))
	for n := range adj {
		names = append(names, n)
	}
	sort.Strings(names)
	return names
}

// nodeExists acepta nodos con adyacencia propia o solo referenciados como vecinos.
func nodeExists(g Graph, node string) bool {
	if node == virtualSource {
		return false
	}
	if _, ok := g[node]; ok {
		return true
	}
	for _, adj := range g {
		if _, ok := adj[node]; ok {
			return true
		}
	}
	return false
}

// OptimalRoute devuelve la ruta más corta entre la base más cercana y el accidente.
// Ejecuta un único Dijkstra desde un origen virtual conectado con peso 0 a todas
// las bases. Si el accidente está en una base, gana esa base (distancia 0);
// si no, en empate de distancia gana la base que aparece primero en depots.
func OptimalRoute(g Graph, accident string, depots []string) (*Route, error) {
	if len(depots) == 0 {
		return nil, ErrNoDepots
	}
	if !nodeExists(g, accident) {
		return nil, ErrUnknownNode
	}
	seedRank := make(map[string]int, len(depots))
	for i, depot := range depots {
		if !nodeExists(g, depot) {
			return nil, fmt.Errorf("%w: %q", ErrUnknownDepot, depot)
		}
		if _, dup := seedRank[depot]; !dup {
			seedRank[depot] = i
		}
	}

	// Copia superficial: no se modifica el grafo recibido.
	withSource := make(Graph, len(g)+1)
	for node, adj := range g {
		withSource[node] = adj
	}
	withSource[virtualSource] = make(map[string]float64, len(seedRank))
	for depot := range seedRank {
		withSource[virtualSource][depot] = 0
	}

	dist, prev, err := dijkstra(withSource, virtualSource, seedRank)
	if err != nil {
		return nil, err
	}
	// Una base en el distrito del accidente gana siempre, antes de cualquier desempate.
	if _, isDepot := seedRank[accident]; isDepot {
		return &Route{FromDepot: accident, To: accident, Path: []string{accident}, Distance: 0}, nil
	}
	d, ok := dist[accident]
	if !ok || math.IsInf(d, 1) {
		return nil, ErrUnreachable
	}
	path := buildPath(prev, virtualSource, accident)[1:] // se descarta el origen virtual
	return &Route{FromDepot: path[0], To: accident, Path: path, Distance: d}, nil
}

func buildPath(prev map[string]string, source, target string) []string {
	path := []string{target}
	for cur := target; cur != source; {
		p, ok := prev[cur]
		if !ok {
			return nil
		}
		path = append([]string{p}, path...)
		cur = p
	}
	return path
}
