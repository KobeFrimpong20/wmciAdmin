package binder

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoginSuccessAndFailure(t *testing.T) {
	r := setupTestRouter(t)

	// Missing password -> 400
	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewBufferString(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Wrong password -> 401
	req = httptest.NewRequest(http.MethodPost, "/login", bytes.NewBufferString(`{"password":"wrong-password"}`))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	// Valid password -> 200 with admin JWT
	body, err := json.Marshal(LoginRequest{Password: testAdminPassword})
	require.NoError(t, err)
	req = httptest.NewRequest(http.MethodPost, "/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)

	var resp LoginResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.NotEmpty(t, resp.Token)
	assert.Equal(t, RoleAdmin, resp.Role)
	_, err = time.Parse(time.RFC3339, resp.ExpiresAt)
	assert.NoError(t, err)

	// GET /auth/me verifies the issued admin session
	wMe := httptest.NewRecorder()
	r.ServeHTTP(wMe, adminGetRequest("/auth/me", resp.Token))
	require.Equal(t, http.StatusOK, wMe.Code)

	var session SessionResponse
	require.NoError(t, json.Unmarshal(wMe.Body.Bytes(), &session))
	assert.Equal(t, RoleAdmin, session.Role)
}

func TestProtectedRoutesEnforceAdminRBAC(t *testing.T) {
	r := setupTestRouter(t)
	cfg := testAuthConfig()

	// Seed one record publicly so detail endpoints also have real IDs to protect
	seed := IntakeForm{
		ID:                   uuid.NewString(),
		FirstName:            "Kwame",
		LastName:             "Nkrumah",
		Phone:                "555-999-0000",
		DateOfBirth:          "1980-09-21",
		AttendanceCommitment: true,
		TitheCommitment:      true,
		PrayerCommitment:     true,
		SoberCommitment:      true,
		RespectCommitment:    true,
		FaithCommitment:      true,
	}
	seedBody, err := json.Marshal(seed)
	require.NoError(t, err)

	seedReq := httptest.NewRequest(http.MethodPost, "/applications", bytes.NewReader(seedBody))
	seedReq.Header.Set("Content-Type", "application/json")
	seedW := httptest.NewRecorder()
	r.ServeHTTP(seedW, seedReq)
	require.Equal(t, http.StatusCreated, seedW.Code)

	var created Application
	require.NoError(t, json.Unmarshal(seedW.Body.Bytes(), &created))

	// Build invalid / unauthorized tokens for RBAC checks
	wrongSecretCfg := AuthConfig{
		AdminPassword: testAdminPassword,
		JWTSecret:     []byte("different-secret"),
		TokenTTL:      time.Hour,
	}
	wrongSecretToken, _, err := wrongSecretCfg.SignToken(RoleAdmin, time.Now().UTC())
	require.NoError(t, err)

	expiredToken, _, err := cfg.SignToken(RoleAdmin, time.Now().UTC().Add(-2*time.Hour))
	require.NoError(t, err)

	nonAdminToken, _, err := cfg.SignToken("member", time.Now().UTC())
	require.NoError(t, err)

	validAdminToken := loginAsAdmin(t, r)

	protectedPaths := []string{
		"/auth/me",
		"/members",
		"/members/" + created.MemberID,
		"/applications",
		"/applications/" + created.ID,
	}

	for _, path := range protectedPaths {
		t.Run(path, func(t *testing.T) {
			// 1. Missing Authorization header -> 401
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))
			assert.Equal(t, http.StatusUnauthorized, w.Code)

			// 2. Malformed Authorization header -> 401
			req := httptest.NewRequest(http.MethodGet, path, nil)
			req.Header.Set("Authorization", "Token "+validAdminToken)
			w = httptest.NewRecorder()
			r.ServeHTTP(w, req)
			assert.Equal(t, http.StatusUnauthorized, w.Code)

			// 3. Token signed with wrong secret -> 401
			w = httptest.NewRecorder()
			r.ServeHTTP(w, adminGetRequest(path, wrongSecretToken))
			assert.Equal(t, http.StatusUnauthorized, w.Code)

			// 4. Expired token -> 401
			w = httptest.NewRecorder()
			r.ServeHTTP(w, adminGetRequest(path, expiredToken))
			assert.Equal(t, http.StatusUnauthorized, w.Code)

			// 5. Validly signed JWT with non-admin role -> 403
			w = httptest.NewRecorder()
			r.ServeHTTP(w, adminGetRequest(path, nonAdminToken))
			assert.Equal(t, http.StatusForbidden, w.Code)

			// 6. Valid admin token -> 200
			w = httptest.NewRecorder()
			r.ServeHTTP(w, adminGetRequest(path, validAdminToken))
			assert.Equal(t, http.StatusOK, w.Code)
		})
	}
}
