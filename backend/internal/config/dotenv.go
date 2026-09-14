package config

import (
	"bufio"
	"os"
	"strings"
)

// tryLoadDotEnv loads backend/.env into the process environment when keys are unset.
// ponytail: no quotes/export syntax; matches env.example one-line KEY=value rows only.
func tryLoadDotEnv() {
	tryLoadDotEnvFile(".env")
}

func tryLoadDotEnvFile(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.TrimSpace(val)
		if key == "" || os.Getenv(key) != "" {
			continue
		}
		_ = os.Setenv(key, val)
	}
}
