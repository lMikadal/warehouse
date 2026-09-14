package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const tokenTypeAccess = "access"

type AccessClaims struct {
	jwt.RegisteredClaims
	UserType string `json:"user_type"`
	RoleID   *int64 `json:"role_id,omitempty"`
}

type TokenIssuer struct {
	secret     []byte
	accessTTL  time.Duration
}

func NewTokenIssuer(secret string, accessTTL time.Duration) (*TokenIssuer, error) {
	if len(secret) < 32 {
		return nil, fmt.Errorf("JWT secret must be at least 32 characters")
	}
	return &TokenIssuer{secret: []byte(secret), accessTTL: accessTTL}, nil
}

func (t *TokenIssuer) SignAccess(userID int64, jti, userType string, roleID *int64) (string, time.Time, error) {
	exp := time.Now().Add(t.accessTTL)
	claims := AccessClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("%d", userID),
			ID:        jti,
			ExpiresAt: jwt.NewNumericDate(exp),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		UserType: userType,
		RoleID:   roleID,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(t.secret)
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, exp, nil
}

func (t *TokenIssuer) ParseAccess(tokenStr string) (*AccessClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &AccessClaims{}, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return t.secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*AccessClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

func (c *AccessClaims) UserID() (int64, error) {
	var id int64
	_, err := fmt.Sscanf(c.Subject, "%d", &id)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("invalid subject")
	}
	return id, nil
}
