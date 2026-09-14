package config

import "testing"

func TestShouldAutoMigrate(t *testing.T) {
	tests := []struct {
		name   string
		cfg    Config
		want   bool
	}{
		{"dev default", Config{AppEnv: "development", AutoMigrate: ""}, true},
		{"prod default", Config{AppEnv: "production", AutoMigrate: ""}, false},
		{"override on in prod", Config{AppEnv: "production", AutoMigrate: "true"}, true},
		{"override off in dev", Config{AppEnv: "development", AutoMigrate: "false"}, false},
		{"yes alias", Config{AppEnv: "production", AutoMigrate: "yes"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.cfg.ShouldAutoMigrate(); got != tt.want {
				t.Fatalf("got %v want %v", got, tt.want)
			}
		})
	}
}
