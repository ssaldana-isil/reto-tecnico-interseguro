package api

import "github.com/ssaldana/routes-service/internal/graph"

type routeRequest struct {
	AccidentLocation string      `json:"accidentLocation"`
	Depots           []string    `json:"depots"`
	Graph            graph.Graph `json:"graph"`
}

type tokenRequest struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
}

type errorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}
