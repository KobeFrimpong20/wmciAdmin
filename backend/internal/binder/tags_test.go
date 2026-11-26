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
	assert.Len(t, TagCatalog, 14)
	for _, def := range TagCatalog {
		assert.True(t, seeded[def.Name], "expected tag %q to be seeded", def.Name)
	}
	assert.False(t, seeded["leadership"], "leadership should be a category only, not a tag")
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

	// 1. New member starts with empty [] tags (not null)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, adminGetRequest("/members/"+created.MemberID, token))
	require.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"tags":[]`)

	// 2. Add tags with mixed casing/whitespace -> normalized, sorted, persisted
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminPatchRequest(path, token, PatchMemberTagsRequest{
		Add: []string{"  Out Of State ", "PASTOR", "usher", "usher"},
	}))
	require.Equal(t, http.StatusOK, w.Code)

	var updated Member
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
	assert.Equal(t, []string{"out of state", "pastor", "usher"}, updated.Tags)

	// 3. Re-adding an already-assigned tag is idempotent
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminPatchRequest(path, token, PatchMemberTagsRequest{
		Add: []string{"pastor", "media"},
	}))
	require.Equal(t, http.StatusOK, w.Code)
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
	assert.Equal(t, []string{"media", "out of state", "pastor", "usher"}, updated.Tags)

	// 4. Simultaneous incremental add + remove (including removing an unassigned tag as a no-op)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminPatchRequest(path, token, PatchMemberTagsRequest{
		Add:    []string{"board", "ex-communicated"},
		Remove: []string{"out of state", "cleaning"},
	}))
	require.Equal(t, http.StatusOK, w.Code)
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
	assert.Equal(t, []string{"board", "ex-communicated", "media", "pastor", "usher"}, updated.Tags)

	// 5. GET /members and GET /members/:id both return the hydrated tags
	wList := httptest.NewRecorder()
	r.ServeHTTP(wList, adminGetRequest("/members", token))
	require.Equal(t, http.StatusOK, wList.Code)
	var list []Member
	require.NoError(t, json.Unmarshal(wList.Body.Bytes(), &list))
	require.Len(t, list, 1)
	assert.Equal(t, []string{"board", "ex-communicated", "media", "pastor", "usher"}, list[0].Tags)

	wDetail := httptest.NewRecorder()
	r.ServeHTTP(wDetail, adminGetRequest("/members/"+created.MemberID, token))
	require.Equal(t, http.StatusOK, wDetail.Code)
	var detail Member
	require.NoError(t, json.Unmarshal(wDetail.Body.Bytes(), &detail))
	assert.Equal(t, []string{"board", "ex-communicated", "media", "pastor", "usher"}, detail.Tags)
}

func TestPatchMemberTagsValidationAndNotFound(t *testing.T) {
	r := setupTestRouter(t)
	token := loginAsAdmin(t, r)
	created := createTestMember(t, r)
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

	// Confirm no partial write occurred from rejected request
	wCheck := httptest.NewRecorder()
	r.ServeHTTP(wCheck, adminGetRequest("/members/"+created.MemberID, token))
	require.Equal(t, http.StatusOK, wCheck.Code)
	var member Member
	require.NoError(t, json.Unmarshal(wCheck.Body.Bytes(), &member))
	assert.Empty(t, member.Tags)

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
