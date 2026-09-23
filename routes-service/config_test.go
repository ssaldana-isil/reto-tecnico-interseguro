package main

import (
	"reflect"
	"testing"
)

func envOf(vars map[string]string) func(string) string {
	return func(key string) string { return vars[key] }
}

func TestLoadConfig_SinSecretosFallaListandoTodos(t *testing.T) {
	_, _, err := loadConfig(envOf(map[string]string{"CLIENT_ID": "web"}))
	want := "faltan variables de entorno obligatorias: JWT_SECRET, CLIENT_SECRET"
	if err == nil || err.Error() != want {
		t.Fatalf("esperaba %q, obtuve %v", want, err)
	}
}

func TestLoadConfig_DefaultsSoloNoSensibles(t *testing.T) {
	cfg, port, err := loadConfig(envOf(map[string]string{"JWT_SECRET": "j", "CLIENT_ID": "c", "CLIENT_SECRET": "s"}))
	if err != nil {
		t.Fatal(err)
	}
	if port != "8080" || !reflect.DeepEqual(cfg.CORSOrigins, []string{"*"}) {
		t.Fatalf("defaults inesperados: port=%s cors=%v", port, cfg.CORSOrigins)
	}
}

func TestLoadConfig_CORSOriginListaSeparadaPorComas(t *testing.T) {
	cfg, _, err := loadConfig(envOf(map[string]string{
		"JWT_SECRET": "j", "CLIENT_ID": "c", "CLIENT_SECRET": "s", "CORS_ORIGIN": "http://a.pe, http://b.pe",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(cfg.CORSOrigins, []string{"http://a.pe", "http://b.pe"}) {
		t.Fatalf("CORS inesperado: %v", cfg.CORSOrigins)
	}
}
