package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ssaldana/routes-service/internal/auth"
	"github.com/ssaldana/routes-service/internal/service"
)

func testCfg() Config {
	return Config{JWTSecret: []byte("test-secret"), ClientID: "web", ClientSecret: "s3cret", TokenTTL: time.Minute}
}

const body = `{"accidentLocation":"San Isidro","depots":["Miraflores","Ate"],
"graph":{"Miraflores":{"San Isidro":7,"Barranco":3},"San Isidro":{"Miraflores":7,"Lince":4},
"Barranco":{"Miraflores":3,"Surco":5},"Lince":{"San Isidro":4,"Surco":6},
"Surco":{"Barranco":5,"Lince":6,"Ate":10},"Ate":{"Surco":10}}}`

func bearer(t *testing.T, cfg Config) string {
	tok, err := auth.Issue(cfg.JWTSecret, "web", time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	return "Bearer " + tok
}

func TestOptimal_OK(t *testing.T) {
	cfg := testCfg()
	req := httptest.NewRequest("POST", "/v1/routes/optimal", strings.NewReader(body))
	req.Header.Set("Authorization", bearer(t, cfg))
	rec := httptest.NewRecorder()
	NewMux(cfg, service.NewRouteService()).ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("esperaba 200, obtuve %d: %s", rec.Code, rec.Body)
	}
	var out map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out["fromDepot"] != "Miraflores" || out["distance"].(float64) != 7 {
		t.Fatalf("respuesta inesperada: %v", out)
	}
}

func TestOptimal_SinToken401(t *testing.T) {
	req := httptest.NewRequest("POST", "/v1/routes/optimal", strings.NewReader(body))
	rec := httptest.NewRecorder()
	NewMux(testCfg(), service.NewRouteService()).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("esperaba 401, obtuve %d", rec.Code)
	}
}

func TestOptimal_Inalcanzable422(t *testing.T) {
	cfg := testCfg()
	iso := `{"accidentLocation":"Callao","depots":["Miraflores"],
"graph":{"Miraflores":{"Barranco":3},"Barranco":{"Miraflores":3},"Callao":{}}}`
	req := httptest.NewRequest("POST", "/v1/routes/optimal", strings.NewReader(iso))
	req.Header.Set("Authorization", bearer(t, cfg))
	rec := httptest.NewRecorder()
	NewMux(cfg, service.NewRouteService()).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("esperaba 422, obtuve %d: %s", rec.Code, rec.Body)
	}
}

func TestToken_CredencialesInvalidas(t *testing.T) {
	req := httptest.NewRequest("POST", "/v1/auth/token", strings.NewReader(`{"clientId":"web","clientSecret":"mala"}`))
	rec := httptest.NewRecorder()
	NewMux(testCfg(), service.NewRouteService()).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("esperaba 401, obtuve %d", rec.Code)
	}
}

func TestOptimal_BaseInexistente400(t *testing.T) {
	cfg := testCfg()
	bad := `{"accidentLocation":"San Isidro","depots":["Miraflores","Narnia"],
"graph":{"Miraflores":{"San Isidro":7},"San Isidro":{"Miraflores":7}}}`
	req := httptest.NewRequest("POST", "/v1/routes/optimal", strings.NewReader(bad))
	req.Header.Set("Authorization", bearer(t, cfg))
	rec := httptest.NewRecorder()
	NewMux(cfg, service.NewRouteService()).ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("esperaba 400, obtuve %d: %s", rec.Code, rec.Body)
	}
	var out errorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil || out.Code != "VALIDATION" {
		t.Fatalf("esperaba code VALIDATION, obtuve %+v (err %v)", out, err)
	}
}

func TestOptimal_CuerpoMayorA1MB413(t *testing.T) {
	cfg := testCfg()
	huge := `{"accidentLocation":"` + strings.Repeat("x", maxBodyBytes) + `"}`
	req := httptest.NewRequest("POST", "/v1/routes/optimal", strings.NewReader(huge))
	req.Header.Set("Authorization", bearer(t, cfg))
	rec := httptest.NewRecorder()
	NewMux(cfg, service.NewRouteService()).ServeHTTP(rec, req)
	if rec.Code != http.StatusRequestEntityTooLarge || !strings.Contains(rec.Body.String(), "PAYLOAD_TOO_LARGE") {
		t.Fatalf("esperaba 413 PAYLOAD_TOO_LARGE, obtuve %d: %s", rec.Code, rec.Body)
	}
}

func corsHeader(t *testing.T, origins []string, origin string) string {
	t.Helper()
	cfg := testCfg()
	cfg.CORSOrigins = origins
	req := httptest.NewRequest("OPTIONS", "/v1/routes/optimal", nil)
	req.Header.Set("Origin", origin)
	rec := httptest.NewRecorder()
	NewMux(cfg, service.NewRouteService()).ServeHTTP(rec, req)
	return rec.Header().Get("Access-Control-Allow-Origin")
}

func TestCORS_Asterisco(t *testing.T) {
	if got := corsHeader(t, []string{"*"}, "http://cualquiera.pe"); got != "*" {
		t.Fatalf("esperaba *, obtuve %q", got)
	}
}

func TestCORS_OrigenPermitidoSeRefleja(t *testing.T) {
	if got := corsHeader(t, []string{"http://a.pe", "http://localhost:5173"}, "http://localhost:5173"); got != "http://localhost:5173" {
		t.Fatalf("esperaba el origen reflejado, obtuve %q", got)
	}
}

func TestCORS_OrigenNoPermitidoSinCabecera(t *testing.T) {
	if got := corsHeader(t, []string{"http://a.pe"}, "http://malicioso.pe"); got != "" {
		t.Fatalf("no esperaba Access-Control-Allow-Origin, obtuve %q", got)
	}
}
