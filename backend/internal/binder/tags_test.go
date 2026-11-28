package binder

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createTestMember(t *testing.T, r *gin.Engine) Application {
	t.Helper()
	payload := IntakeForm{
		ID:                   uuid.NewString(),
		FirstName:            "Kofi",
		LastName:             "Annan",
		Email:                "kofi@example.com",
		Phone:                "555-321-0000",
		DateOfBirth:          "1975-04-08",
		AttendanceCommitment: true,
		TitheCommitment:      true,
		PrayerCommitment:     true,
		SoberCommitment:      true,
		RespectCommitment:    true,
		FaithCommitment:      true,
	}
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/applications", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code)

	var created Application
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	return created
}

func adminPatchRequest(path, token string, payload any) *http.Request {
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPatch, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return req
}

func TestOpenDBSeedsFixedTags(t *testing.T) {
	db, err := OpenDB(":memory:")
	require.NoError(t, err)
	defer db.Close()

	rows, err := db.Query(`SELECT name FROM tags ORDER BY name ASC`)
	require.NoError(t, err)
	defer rows.Close()

	seeded := map[string]bool{}
	for rows.Next() {
		var name string
		require.NoError(t, rows.Scan(&name))
		seeded[name] = true
	}
	require.NoError(t, rows.Err())

	assert.Len(t, seeded, len(TagCatalog))
	assert.Len(t, TagCatalog, 16)
	for _, def := range TagCatalog {
		assert.True(t, seeded[def.Name], "expected tag %q to be seeded", def.Name)
	}
	assert.True(t, seeded["active"])
	assert.True(t, seeded["inactive"])
	assert.False(t, seeded["leadership"], "leadership should be a category only, not a tag")
}

func TestSeedTagsBackfillsLegacyMembersWithActive(t *testing.T) {
	db, err := OpenDB(":memory:")
	require.NoError(t, err)
	defer db.Close()

	// Insert an accepted legacy member with no rows in member_tags,
	// an accepted member with 'inactive', and a pending member with no tags.
	legacyID := uuid.NewString()
	inactiveID := uuid.NewString()
	pendingID := uuid.NewString()
	now := time.Now().UTC().Format(time.RFC3339)

	_, err = db.Exec(`
		INSERT INTO members (id, full_name, date_of_birth, phone, email, address, joined_at, membership_status)
		VALUES (?, 'Mensah, Legacy', '1990-01-01', '5550001111', '', '', ?, 'accepted'),
		       (?, 'Mensah, Inactive', '1991-02-02', '5550002222', '', '', ?, 'accepted'),
		       (?, 'Mensah, Pending', '1992-03-03', '5550003333', '', '', ?, 'pending')
	`, legacyID, now, inactiveID, now, pendingID, now)
	require.NoError(t, err)

	_, err = db.Exec(`INSERT INTO member_tags (member_id, tag_name) VALUES (?, 'inactive')`, inactiveID)
	require.NoError(t, err)

	require.NoError(t, seedTags(db))

	legacyTags, err := fetchMemberTags(t.Context(), db, legacyID)
	require.NoError(t, err)
	assert.Equal(t, []string{"active"}, legacyTags)

	inactiveTags, err := fetchMemberTags(t.Context(), db, inactiveID)
	require.NoError(t, err)
	assert.Equal(t, []string{"inactive"}, inactiveTags)

	pendingTags, err := fetchMemberTags(t.Context(), db, pendingID)
	require.NoError(t, err)
	assert.Empty(t, pendingTags)
}

func TestPatchMemberTagsEnforcesAdminRBAC(t *testing.T) {
	r := setupTestRouter(t)
	created := createTestMember(t, r)
	path := "/members/" + created.MemberID + "/tags"

	// Unauthenticated -> 401
	w := httptest.NewRecorder()
	r.ServeHTTP(w, adminPatchRequest(path, "", PatchMemberTagsRequest{Add: []string{"usher"}}))
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	// Valid JWT without admin role -> 403
	nonAdminToken, _, err := testAuthConfig().SignToken("member", time.Now().UTC())
	require.NoError(t, err)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminPatchRequest(path, nonAdminToken, PatchMemberTagsRequest{Add: []string{"usher"}}))
	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestPatchMemberTagsLifecycle(t *testing.T) {
	r := setupTestRouter(t)
	token := loginAsAdmin(t, r)
	created := createTestMember(t, r)
	path := "/members/" + created.MemberID + "/tags"

	// 0. Pending member cannot be tagged until accepted -> 409
	wPending := httptest.NewRecorder()
	r.ServeHTTP(wPending, adminPatchRequest(path, token, PatchMemberTagsRequest{Add: []string{"usher"}}))
	assert.Equal(t, http.StatusConflict, wPending.Code)

	// Accept member so they enter the active directory with default ["active"]
	acceptApplicationAsAdmin(t, r, created.ID, token)

	// 1. Accepted member defaults to ["active"]
	w := httptest.NewRecorder()
	r.ServeHTTP(w, adminGetRequest("/members/"+created.MemberID, token))
	require.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"tags":["active"]`)

	// 2. Add tags with mixed casing/whitespace -> normalized, sorted, persisted alongside "active"
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminPatchRequest(path, token, PatchMemberTagsRequest{
		Add: []string{"  Out Of State ", "PASTOR", "usher", "usher"},
	}))
	require.Equal(t, http.StatusOK, w.Code)

	var updated Member
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
	assert.Equal(t, []string{"active", "out of state", "pastor", "usher"}, updated.Tags)

	// 3. Re-adding an already-assigned tag is idempotent
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminPatchRequest(path, token, PatchMemberTagsRequest{
		Add: []string{"pastor", "media"},
	}))
	require.Equal(t, http.StatusOK, w.Code)
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
	assert.Equal(t, []string{"active", "media", "out of state", "pastor", "usher"}, updated.Tags)

	// 4. Simultaneous incremental add + remove (switching active -> inactive, plus removing unassigned tag as no-op)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminPatchRequest(path, token, PatchMemberTagsRequest{
		Add:    []string{"board", "ex-communicated", "inactive"},
		Remove: []string{"active", "out of state", "cleaning"},
	}))
	require.Equal(t, http.StatusOK, w.Code)
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
	assert.Equal(t, []string{"board", "ex-communicated", "inactive", "media", "pastor", "usher"}, updated.Tags)

	// 5. GET /members and GET /members/:id both return the hydrated tags
	wList := httptest.NewRecorder()
	r.ServeHTTP(wList, adminGetRequest("/members", token))
	require.Equal(t, http.StatusOK, wList.Code)
	var list []Member
	require.NoError(t, json.Unmarshal(wList.Body.Bytes(), &list))
	require.Len(t, list, 1)
	assert.Equal(t, []string{"board", "ex-communicated", "inactive", "media", "pastor", "usher"}, list[0].Tags)

	wDetail := httptest.NewRecorder()
	r.ServeHTTP(wDetail, adminGetRequest("/members/"+created.MemberID, token))
	require.Equal(t, http.StatusOK, wDetail.Code)
	var detail Member
	require.NoError(t, json.Unmarshal(wDetail.Body.Bytes(), &detail))
	assert.Equal(t, []string{"board", "ex-communicated", "inactive", "media", "pastor", "usher"}, detail.Tags)

	// 6. Removing all tags returns empty JSON array [] rather than null
	wClear := httptest.NewRecorder()
	r.ServeHTTP(wClear, adminPatchRequest(path, token, PatchMemberTagsRequest{
		Remove: []string{"board", "ex-communicated", "inactive", "media", "pastor", "usher"},
	}))
	require.Equal(t, http.StatusOK, wClear.Code)
	assert.Contains(t, wClear.Body.String(), `"tags":[]`)
}

func TestPatchMemberTagsValidationAndNotFound(t *testing.T) {
	r := setupTestRouter(t)
	token := loginAsAdmin(t, r)
	created := createTestMember(t, r)
	acceptApplicationAsAdmin(t, r, created.ID, token)
	path := "/members/" + created.MemberID + "/tags"

	// Empty add & remove -> 400
	w := httptest.NewRecorder()
	r.ServeHTTP(w, adminPatchRequest(path, token, PatchMemberTagsRequest{}))
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Category name ("leadership") is not a valid tag -> 400, zero partial writes
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminPatchRequest(path, token, PatchMemberTagsRequest{
		Add: []string{"usher", "leadership"},
	}))
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Unknown tag in remove -> 400
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminPatchRequest(path, token, PatchMemberTagsRequest{
		Remove: []string{"women ministry"},
	}))
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Confirm no partial write occurred from rejected request (only default "active" remains)
	wCheck := httptest.NewRecorder()
	r.ServeHTTP(wCheck, adminGetRequest("/members/"+created.MemberID, token))
	require.Equal(t, http.StatusOK, wCheck.Code)
	var member Member
	require.NoError(t, json.Unmarshal(wCheck.Body.Bytes(), &member))
	assert.Equal(t, []string{"active"}, member.Tags)

	// Same tag in both add and remove -> 400
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminPatchRequest(path, token, PatchMemberTagsRequest{
		Add:    []string{"media"},
		Remove: []string{"MEDIA"},
	}))
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Unknown member ID -> 404
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminPatchRequest("/members/"+uuid.NewString()+"/tags", token, PatchMemberTagsRequest{
		Add: []string{"usher"},
	}))
	assert.Equal(t, http.StatusNotFound, w.Code)
}
