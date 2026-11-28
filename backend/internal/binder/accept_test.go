package binder

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAcceptAndRejectEnforceAdminRBAC(t *testing.T) {
	r := setupTestRouter(t)
	created := createTestMember(t, r)

	nonAdminToken, _, err := testAuthConfig().SignToken("member", time.Now().UTC())
	require.NoError(t, err)

	// POST /applications/:id/accept requires admin JWT
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/applications/"+created.ID+"/accept", nil))
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	req := httptest.NewRequest(http.MethodPost, "/applications/"+created.ID+"/accept", nil)
	req.Header.Set("Authorization", "Bearer "+nonAdminToken)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusForbidden, w.Code)

	// DELETE /applications/:id requires admin JWT
	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodDelete, "/applications/"+created.ID, nil))
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	req = httptest.NewRequest(http.MethodDelete, "/applications/"+created.ID, nil)
	req.Header.Set("Authorization", "Bearer "+nonAdminToken)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestAcceptApplicationLifecycle(t *testing.T) {
	r := setupTestRouter(t)
	token := loginAsAdmin(t, r)
	created := createTestMember(t, r)

	// 1. Before acceptance: appears in GET /applications, NOT in GET /members, has no tags
	wApps := httptest.NewRecorder()
	r.ServeHTTP(wApps, adminGetRequest("/applications", token))
	require.Equal(t, http.StatusOK, wApps.Code)
	var apps []Application
	require.NoError(t, json.Unmarshal(wApps.Body.Bytes(), &apps))
	require.Len(t, apps, 1)
	assert.Equal(t, created.ID, apps[0].ID)

	wMembers := httptest.NewRecorder()
	r.ServeHTTP(wMembers, adminGetRequest("/members", token))
	require.Equal(t, http.StatusOK, wMembers.Code)
	assert.Equal(t, "[]", wMembers.Body.String())

	wPendingDetail := httptest.NewRecorder()
	r.ServeHTTP(wPendingDetail, adminGetRequest("/members/"+created.MemberID, token))
	require.Equal(t, http.StatusOK, wPendingDetail.Code)
	var pendingMember Member
	require.NoError(t, json.Unmarshal(wPendingDetail.Body.Bytes(), &pendingMember))
	assert.Equal(t, MembershipStatusPending, pendingMember.MembershipStatus)
	assert.Empty(t, pendingMember.Tags)

	// 2. Invalid pastor_signature_date -> 400
	badReq := httptest.NewRequest(
		http.MethodPost,
		"/applications/"+created.ID+"/accept",
		bytes.NewBufferString(`{"pastor_signature_date":"11/27/2026"}`),
	)
	badReq.Header.Set("Content-Type", "application/json")
	badReq.Header.Set("Authorization", "Bearer "+token)
	wBad := httptest.NewRecorder()
	r.ServeHTTP(wBad, badReq)
	assert.Equal(t, http.StatusBadRequest, wBad.Code)

	// 3. Accept with explicit pastor_signature_date -> 200
	acceptReq := httptest.NewRequest(
		http.MethodPost,
		"/applications/"+created.ID+"/accept",
		bytes.NewBufferString(`{"pastor_signature_date":"2026-11-27"}`),
	)
	acceptReq.Header.Set("Content-Type", "application/json")
	acceptReq.Header.Set("Authorization", "Bearer "+token)
	wAccept := httptest.NewRecorder()
	r.ServeHTTP(wAccept, acceptReq)
	require.Equal(t, http.StatusOK, wAccept.Code)

	var resp AcceptApplicationResponse
	require.NoError(t, json.Unmarshal(wAccept.Body.Bytes(), &resp))
	require.NotNil(t, resp.Application.PastorSignatureDate)
	assert.Equal(t, "2026-11-27", *resp.Application.PastorSignatureDate)
	assert.Equal(t, MembershipStatusAccepted, resp.Member.MembershipStatus)
	assert.Equal(t, []string{"active"}, resp.Member.Tags)

	// 4. After acceptance: removed from pending GET /applications, listed in GET /members
	wApps = httptest.NewRecorder()
	r.ServeHTTP(wApps, adminGetRequest("/applications", token))
	require.Equal(t, http.StatusOK, wApps.Code)
	assert.Equal(t, "[]", wApps.Body.String())

	// Historical application snapshot still accessible via ?member_id=... and /applications/:id
	wHistory := httptest.NewRecorder()
	r.ServeHTTP(wHistory, adminGetRequest("/applications?member_id="+created.MemberID, token))
	require.Equal(t, http.StatusOK, wHistory.Code)
	require.NoError(t, json.Unmarshal(wHistory.Body.Bytes(), &apps))
	require.Len(t, apps, 1)
	require.NotNil(t, apps[0].PastorSignatureDate)
	assert.Equal(t, "2026-11-27", *apps[0].PastorSignatureDate)

	wMembers = httptest.NewRecorder()
	r.ServeHTTP(wMembers, adminGetRequest("/members", token))
	require.Equal(t, http.StatusOK, wMembers.Code)
	var members []Member
	require.NoError(t, json.Unmarshal(wMembers.Body.Bytes(), &members))
	require.Len(t, members, 1)
	assert.Equal(t, created.MemberID, members[0].ID)
	assert.Equal(t, []string{"active"}, members[0].Tags)

	// 5. Accepting an already-accepted application -> 409 Conflict
	dupAccept := httptest.NewRequest(http.MethodPost, "/applications/"+created.ID+"/accept", nil)
	dupAccept.Header.Set("Authorization", "Bearer "+token)
	wDup := httptest.NewRecorder()
	r.ServeHTTP(wDup, dupAccept)
	assert.Equal(t, http.StatusConflict, wDup.Code)

	// 6. Rejecting an already-accepted application -> 409 Conflict (member stays intact)
	rejAccepted := httptest.NewRequest(http.MethodDelete, "/applications/"+created.ID, nil)
	rejAccepted.Header.Set("Authorization", "Bearer "+token)
	wRejAccepted := httptest.NewRecorder()
	r.ServeHTTP(wRejAccepted, rejAccepted)
	assert.Equal(t, http.StatusConflict, wRejAccepted.Code)

	wStillThere := httptest.NewRecorder()
	r.ServeHTTP(wStillThere, adminGetRequest("/members/"+created.MemberID, token))
	assert.Equal(t, http.StatusOK, wStillThere.Code)

	// 7. Unknown application ID -> 404
	notFoundReq := httptest.NewRequest(http.MethodPost, "/applications/"+uuid.NewString()+"/accept", nil)
	notFoundReq.Header.Set("Authorization", "Bearer "+token)
	wNotFound := httptest.NewRecorder()
	r.ServeHTTP(wNotFound, notFoundReq)
	assert.Equal(t, http.StatusNotFound, wNotFound.Code)
}

func TestRejectApplicationDeletesMemberAndAllowsReapply(t *testing.T) {
	r := setupTestRouter(t)
	token := loginAsAdmin(t, r)
	created := createTestMember(t, r)

	// 1. DELETE /applications/:id deletes pending member and cascades to application -> 204
	delReq := httptest.NewRequest(http.MethodDelete, "/applications/"+created.ID, nil)
	delReq.Header.Set("Authorization", "Bearer "+token)
	wDel := httptest.NewRecorder()
	r.ServeHTTP(wDel, delReq)
	require.Equal(t, http.StatusNoContent, wDel.Code)

	// 2. Both application and member are gone
	wApp := httptest.NewRecorder()
	r.ServeHTTP(wApp, adminGetRequest("/applications/"+created.ID, token))
	assert.Equal(t, http.StatusNotFound, wApp.Code)

	wMember := httptest.NewRecorder()
	r.ServeHTTP(wMember, adminGetRequest("/members/"+created.MemberID, token))
	assert.Equal(t, http.StatusNotFound, wMember.Code)

	wApps := httptest.NewRecorder()
	r.ServeHTTP(wApps, adminGetRequest("/applications", token))
	assert.Equal(t, "[]", wApps.Body.String())

	// 3. Rejecting unknown application ID -> 404
	delMissing := httptest.NewRequest(http.MethodDelete, "/applications/"+uuid.NewString(), nil)
	delMissing.Header.Set("Authorization", "Bearer "+token)
	wMissing := httptest.NewRecorder()
	r.ServeHTTP(wMissing, delMissing)
	assert.Equal(t, http.StatusNotFound, wMissing.Code)

	// 4. The rejected person can cleanly submit a new application later
	reapplied := createTestMember(t, r)
	assert.NotEqual(t, created.ID, reapplied.ID)
	assert.NotEqual(t, created.MemberID, reapplied.MemberID)
}

func TestMigrateLegacyMembersDatabase(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "legacy.db")

	// Create a legacy database without membership_status on members
	rawDB, err := sql.Open("sqlite3", dbPath)
	require.NoError(t, err)

	_, err = rawDB.Exec(`
		CREATE TABLE members (
			id TEXT PRIMARY KEY,
			full_name TEXT NOT NULL COLLATE NOCASE CHECK(length(trim(full_name)) > 0),
			date_of_birth TEXT NOT NULL CHECK(length(trim(date_of_birth)) > 0),
			phone TEXT NOT NULL CHECK(length(trim(phone)) > 0),
			email TEXT NOT NULL DEFAULT '',
			address TEXT NOT NULL DEFAULT '',
			joined_at TEXT NOT NULL,
			UNIQUE(full_name, date_of_birth, phone)
		);
		INSERT INTO members (id, full_name, date_of_birth, phone, email, address, joined_at)
		VALUES ('legacy-member-1', 'Mensah, Grace', '1990-01-01', '5551234567', 'grace@example.com', '', '2026-01-01T00:00:00Z');
	`)
	require.NoError(t, err)
	require.NoError(t, rawDB.Close())

	// Re-open via OpenDB to run the mini-migration + tag seeding
	migratedDB, err := OpenDB(dbPath)
	require.NoError(t, err)
	defer migratedDB.Close()

	var status string
	err = migratedDB.QueryRow(`SELECT membership_status FROM members WHERE id = 'legacy-member-1'`).Scan(&status)
	require.NoError(t, err)
	assert.Equal(t, MembershipStatusAccepted, status)

	tags, err := fetchMemberTags(t.Context(), migratedDB, "legacy-member-1")
	require.NoError(t, err)
	assert.Equal(t, []string{"active"}, tags)
}
