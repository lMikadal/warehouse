package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
)

func NewRefreshToken() (plain string, hash string, err error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	plain = base64.RawURLEncoding.EncodeToString(b)
	hash = HashRefreshToken(plain)
	return plain, hash, nil
}

func HashRefreshToken(plain string) string {
	sum := sha256.Sum256([]byte(plain))
	return hex.EncodeToString(sum[:])
}

func NewJTI() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
