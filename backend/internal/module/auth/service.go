package auth

import (
	"context"
	"database/sql"
	"errors"
	"time"

	pkgauth "github.com/lMikadal/warehouse/backend/internal/auth"
)

const maxFailedAttempts = 5
const lockDuration = 15 * time.Minute

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrAccountInactive    = errors.New("account not active")
	ErrAccountLocked      = errors.New("account locked")
)

type Service struct {
	users    *UserRepository
	sessions *SessionRepository
	issuer   *pkgauth.TokenIssuer
	refreshTTL time.Duration
}

func NewService(users *UserRepository, sessions *SessionRepository, issuer *pkgauth.TokenIssuer, refreshTTL time.Duration) *Service {
	return &Service{users: users, sessions: sessions, issuer: issuer, refreshTTL: refreshTTL}
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
	User         UserProfile `json:"user"`
}

func (s *Service) Login(ctx context.Context, username, password, ip, userAgent string) (*TokenPair, error) {
	u, err := s.users.FindByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	if u == nil || !pkgauth.CheckPassword(u.PasswordHash, password) {
		if u != nil {
			attempts := u.FailedLoginAttempts + 1
			var locked *time.Time
			if attempts >= maxFailedAttempts {
				t := time.Now().Add(lockDuration)
				locked = &t
			}
			_ = s.users.RecordLoginFailure(ctx, u.ID, attempts, locked)
		}
		return nil, ErrInvalidCredentials
	}
	if u.Status != "active" {
		return nil, ErrAccountInactive
	}
	if u.LockedUntil.Valid && u.LockedUntil.Time.After(time.Now()) {
		return nil, ErrAccountLocked
	}
	if err := s.users.RecordLoginSuccess(ctx, u.ID); err != nil {
		return nil, err
	}
	return s.issueTokens(ctx, u, ip, userAgent)
}

func (s *Service) Refresh(ctx context.Context, refreshPlain, ip, userAgent string) (*TokenPair, error) {
	hash := pkgauth.HashRefreshToken(refreshPlain)
	sess, err := s.sessions.FindByRefreshHash(ctx, hash)
	if err != nil || sess == nil {
		return nil, ErrInvalidCredentials
	}
	u, err := s.users.GetProfile(ctx, sess.AdminUserID)
	if err != nil || u == nil {
		return nil, ErrInvalidCredentials
	}
	_ = s.sessions.Revoke(ctx, sess.ID, "refresh_rotate")
	_ = s.sessions.TouchRefresh(ctx, sess.ID)
	loginUser := &LoginUser{ID: u.ID, Username: u.Username, Type: u.Type, Status: "active"}
	if u.AdminRoleID != nil {
		loginUser.AdminRoleID = sql.NullInt64{Int64: *u.AdminRoleID, Valid: true}
	}
	return s.issueTokens(ctx, loginUser, ip, userAgent)
}

func (s *Service) Logout(ctx context.Context, jti, refreshPlain string) error {
	if jti != "" {
		return s.sessions.RevokeByJTI(ctx, jti, "logout")
	}
	if refreshPlain != "" {
		hash := pkgauth.HashRefreshToken(refreshPlain)
		sess, err := s.sessions.FindByRefreshHash(ctx, hash)
		if err != nil {
			return err
		}
		if sess != nil {
			return s.sessions.Revoke(ctx, sess.ID, "logout")
		}
	}
	return nil
}

func (s *Service) Me(ctx context.Context, userID int64) (*UserProfile, error) {
	return s.users.GetProfile(ctx, userID)
}

func (s *Service) issueTokens(ctx context.Context, u *LoginUser, ip, userAgent string) (*TokenPair, error) {
	jti, err := pkgauth.NewJTI()
	if err != nil {
		return nil, err
	}
	var roleID *int64
	if u.AdminRoleID.Valid {
		roleID = &u.AdminRoleID.Int64
	}
	access, exp, err := s.issuer.SignAccess(u.ID, jti, u.Type, roleID)
	if err != nil {
		return nil, err
	}
	refreshPlain, refreshHash, err := pkgauth.NewRefreshToken()
	if err != nil {
		return nil, err
	}
	expiresAt := time.Now().Add(s.refreshTTL)
	if err := s.sessions.Create(ctx, u.ID, refreshHash, jti, expiresAt, ip, userAgent); err != nil {
		return nil, err
	}
	profile, err := s.users.GetProfile(ctx, u.ID)
	if err != nil {
		return nil, err
	}
	return &TokenPair{
		AccessToken:  access,
		RefreshToken: refreshPlain,
		TokenType:    "Bearer",
		ExpiresIn:    int64(time.Until(exp).Seconds()),
		User:         *profile,
	}, nil
}
