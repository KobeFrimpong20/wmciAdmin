package binder

import (
	"crypto/sha256"
	"crypto/subtle"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const (
	RoleAdmin       = "admin"
	ContextRoleKey  = "role"
	DefaultTokenTTL = 24 * time.Hour
	jwtIssuer       = "digital-binder"
)

// AuthConfig holds the single-password and JWT signing settings for RBAC.
type AuthConfig struct {
	AdminPassword string
	JWTSecret     []byte
	TokenTTL      time.Duration
}

// AuthClaims defines the JWT payload issued upon admin authentication.
type AuthClaims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

// LoginRequest is the JSON payload submitted to POST /login.
type LoginRequest struct {
	Password string `json:"password" binding:"required"`
}

// LoginResponse is returned by POST /login when authentication succeeds.
type LoginResponse struct {
	Token     string `json:"token"`
	Role      string `json:"role"`
	ExpiresAt string `json:"expires_at"`
}

// SessionResponse is returned by GET /auth/me for a verified session.
type SessionResponse struct {
	Role string `json:"role"`
}

func (cfg AuthConfig) tokenTTL() time.Duration {
	if cfg.TokenTTL <= 0 {
		return DefaultTokenTTL
	}
	return cfg.TokenTTL
}

// VerifyPassword compares a submitted password against the configured admin password
// in constant time using SHA-256 digests.
func (cfg AuthConfig) VerifyPassword(candidate string) bool {
	if cfg.AdminPassword == "" || candidate == "" {
		return false
	}
	expected := sha256.Sum256([]byte(cfg.AdminPassword))
	actual := sha256.Sum256([]byte(candidate))
	return subtle.ConstantTimeCompare(expected[:], actual[:]) == 1
}

// SignToken creates a signed HS256 JWT carrying the given role.
func (cfg AuthConfig) SignToken(role string, now time.Time) (string, time.Time, error) {
	if len(cfg.JWTSecret) == 0 {
		return "", time.Time{}, errors.New("jwt secret is not configured")
	}

	issuedAt := now.UTC()
	expiresAt := issuedAt.Add(cfg.tokenTTL())
	claims := AuthClaims{
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Subject:   role,
			IssuedAt:  jwt.NewNumericDate(issuedAt),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(cfg.JWTSecret)
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expiresAt, nil
}

// ParseToken verifies a JWT signature, algorithm, issuer, and expiration, returning its claims.
func (cfg AuthConfig) ParseToken(tokenString string) (*AuthClaims, error) {
	if len(cfg.JWTSecret) == 0 {
		return nil, errors.New("jwt secret is not configured")
	}

	claims := &AuthClaims{}
	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(t *jwt.Token) (any, error) {
			return cfg.JWTSecret, nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(jwtIssuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}

	return claims, nil
}

// Login authenticates an admin with the configured password and issues a signed JWT.
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password is required"})
		return
	}

	if !h.Auth.VerifyPassword(req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
		return
	}

	token, expiresAt, err := h.Auth.SignToken(RoleAdmin, time.Now().UTC())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authentication token"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{
		Token:     token,
		Role:      RoleAdmin,
		ExpiresAt: expiresAt.Format(time.RFC3339),
	})
}

// GetCurrentSession returns the authenticated caller's role for session verification.
func (h *Handler) GetCurrentSession(c *gin.Context) {
	role, _ := c.Get(ContextRoleKey)
	roleStr, _ := role.(string)
	c.JSON(http.StatusOK, SessionResponse{Role: roleStr})
}

// RequireRole enforces JWT authentication and checks that the token's role is permitted.
func (h *Handler) RequireRole(allowedRoles ...string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(allowedRoles))
	for _, role := range allowedRoles {
		allowed[role] = struct{}{}
	}

	return func(c *gin.Context) {
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		scheme, tokenString, ok := strings.Cut(authHeader, " ")
		tokenString = strings.TrimSpace(tokenString)
		if !ok || !strings.EqualFold(scheme, "Bearer") || tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			return
		}

		claims, err := h.Auth.ParseToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		if _, permitted := allowed[claims.Role]; !permitted {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			return
		}

		c.Set(ContextRoleKey, claims.Role)
		c.Next()
	}
}
