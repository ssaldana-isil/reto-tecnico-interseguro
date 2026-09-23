package graph

import (
	"errors"
	"reflect"
	"testing"
)

func limaGraph() Graph {
	return Graph{
		"Miraflores": {"San Isidro": 7, "Barranco": 3},
		"San Isidro": {"Miraflores": 7, "Lince": 4},
		"Barranco":   {"Miraflores": 3, "Surco": 5},
		"Lince":      {"San Isidro": 4, "Surco": 6},
		"Surco":      {"Barranco": 5, "Lince": 6, "Ate": 10},
		"Ate":        {"Surco": 10},
	}
}

func TestOptimalRoute_EligeElDepositoMasCercano(t *testing.T) {
	r, err := OptimalRoute(limaGraph(), "San Isidro", []string{"Miraflores", "Ate"})
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	if r.FromDepot != "Miraflores" || r.Distance != 7 {
		t.Fatalf("esperaba Miraflores/7, obtuve %s/%v", r.FromDepot, r.Distance)
	}
	if !reflect.DeepEqual(r.Path, []string{"Miraflores", "San Isidro"}) {
		t.Fatalf("camino inesperado: %v", r.Path)
	}
}

func TestOptimalRoute_CaminoMultiSalto(t *testing.T) {
	r, err := OptimalRoute(limaGraph(), "Ate", []string{"Miraflores"})
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	// Miraflores→Barranco(3)→Surco(5)→Ate(10) = 18
	if r.Distance != 18 {
		t.Fatalf("esperaba distancia 18, obtuve %v", r.Distance)
	}
	if !reflect.DeepEqual(r.Path, []string{"Miraflores", "Barranco", "Surco", "Ate"}) {
		t.Fatalf("camino inesperado: %v", r.Path)
	}
}

func TestOptimalRoute_Inalcanzable(t *testing.T) {
	g := limaGraph()
	g["Callao"] = map[string]float64{} // nodo aislado
	_, err := OptimalRoute(g, "Callao", []string{"Miraflores"})
	if !errors.Is(err, ErrUnreachable) {
		t.Fatalf("esperaba ErrUnreachable, obtuve %v", err)
	}
}

func TestOptimalRoute_NodoInexistente(t *testing.T) {
	_, err := OptimalRoute(limaGraph(), "Narnia", []string{"Miraflores"})
	if !errors.Is(err, ErrUnknownNode) {
		t.Fatalf("esperaba ErrUnknownNode, obtuve %v", err)
	}
}

func TestOptimalRoute_SinDepositos(t *testing.T) {
	_, err := OptimalRoute(limaGraph(), "San Isidro", nil)
	if !errors.Is(err, ErrNoDepots) {
		t.Fatalf("esperaba ErrNoDepots, obtuve %v", err)
	}
}

func TestOptimalRoute_EmpateDevuelveElMasCorto(t *testing.T) {
	g := Graph{
		"A": {"X": 5},
		"B": {"X": 5},
		"X": {"A": 5, "B": 5},
	}
	r, err := OptimalRoute(g, "X", []string{"A", "B"})
	if err != nil || r.Distance != 5 {
		t.Fatalf("esperaba distancia 5, obtuve %v (err %v)", r, err)
	}
}

func TestOptimalRoute_PesoNegativo(t *testing.T) {
	g := Graph{
		"A": {"B": -1},
		"B": {"A": 1},
	}
	_, err := OptimalRoute(g, "B", []string{"A"})
	if !errors.Is(err, ErrNegativeWeight) {
		t.Fatalf("esperaba ErrNegativeWeight, obtuve %v", err)
	}
}

func TestOptimalRoute_BaseInexistente(t *testing.T) {
	_, err := OptimalRoute(limaGraph(), "San Isidro", []string{"Miraflores", "Narnia"})
	if !errors.Is(err, ErrUnknownDepot) {
		t.Fatalf("esperaba ErrUnknownDepot, obtuve %v", err)
	}
}

func TestOptimalRoute_BaseIgualAccidente(t *testing.T) {
	r, err := OptimalRoute(limaGraph(), "Ate", []string{"Miraflores", "Ate"})
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	want := &Route{FromDepot: "Ate", To: "Ate", Path: []string{"Ate"}, Distance: 0}
	if !reflect.DeepEqual(r, want) {
		t.Fatalf("esperaba %+v, obtuve %+v", want, r)
	}
}

func TestOptimalRoute_EmpateEntreBasesRespetaOrdenDelRequest(t *testing.T) {
	g := Graph{
		"A": {"X": 5},
		"B": {"X": 5},
		"X": {"A": 5, "B": 5},
	}
	for _, depots := range [][]string{{"A", "B"}, {"B", "A"}} {
		for i := 0; i < 100; i++ {
			r, err := OptimalRoute(g, "X", depots)
			if err != nil {
				t.Fatalf("error inesperado: %v", err)
			}
			if r.FromDepot != depots[0] || !reflect.DeepEqual(r.Path, []string{depots[0], "X"}) {
				t.Fatalf("depots %v, iteración %d: esperaba base %s, obtuve %+v", depots, i, depots[0], r)
			}
		}
	}
}

func TestOptimalRoute_EmpateDeCaminosEsDeterminista(t *testing.T) {
	// Dos caminos de igual distancia desde la misma base: A→B→D y A→C→D.
	g := Graph{
		"A": {"B": 1, "C": 1},
		"B": {"D": 1},
		"C": {"D": 1},
	}
	first, err := OptimalRoute(g, "D", []string{"A"})
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	for i := 0; i < 100; i++ {
		r, _ := OptimalRoute(g, "D", []string{"A"})
		if !reflect.DeepEqual(r, first) {
			t.Fatalf("iteración %d: resultado distinto %+v vs %+v", i, r, first)
		}
	}
}

func TestOptimalRoute_BaseIgualAccidenteGanaAunqueOtraBaseEmpateConPesoCero(t *testing.T) {
	// A está listada primero y llega a X con distancia 0, pero X es base y accidente.
	g := Graph{
		"A": {"X": 0},
		"X": {"A": 0},
	}
	r, err := OptimalRoute(g, "X", []string{"A", "X"})
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	want := &Route{FromDepot: "X", To: "X", Path: []string{"X"}, Distance: 0}
	if !reflect.DeepEqual(r, want) {
		t.Fatalf("esperaba %+v, obtuve %+v", want, r)
	}
}
