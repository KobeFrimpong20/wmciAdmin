package binder

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)

	db, err := OpenDB(":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	r := gin.New()
	NewHandler(db).RegisterRoutes(r)
	return r
}

func TestApplicationAndMemberLifecycle(t *testing.T) {
	r := setupTestRouter(t)

	// 1. Empty lists return [] rather than null
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/members", nil))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "[]", w.Body.String())

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/applications", nil))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "[]", w.Body.String())

	// 2. POST /applications creates both member and immutable application snapshot
	sigDate := "2026-11-24"
	payload := IntakeForm{
		FirstName:            "Grace",
		LastName:             "Hopper",
		Email:                "grace@example.com",
		Phone:                "555-0100",
		Address:              "123 Harbor Rd",
		DateOfBirth:          "1990-12-09",
		MaritalStatus:        "single",
		NumChildren:          0,
		BornAgain:            true,
		WaterBaptized:        true,
		SpeakTongues:         false,
		PrevChurch:           "First Grace",
		AttendanceCommitment: true,
		TitheCommitment:      true,
		PrayerCommitment:     true,
		SoberCommitment:      true,
		RespectCommitment:    true,
		FaithCommitment:      true,
		MemberSignatureDate:  &sigDate,
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/applications", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusCreated, w.Code)

	var created Application
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	assert.NoError(t, uuid.Validate(created.ID))
	assert.NoError(t, uuid.Validate(created.MemberID))
	assert.Equal(t, "Grace", created.FirstName)
	assert.Equal(t, "Hopper", created.LastName)
	assert.Equal(t, "grace@example.com", created.Email)
	assert.True(t, created.BornAgain)
	assert.True(t, created.TitheCommitment)
	require.NotNil(t, created.MemberSignatureDate)
	assert.Equal(t, sigDate, *created.MemberSignatureDate)

	// 3. GET /applications lists the created snapshot
	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/applications", nil))
	require.Equal(t, http.StatusOK, w.Code)

	var apps []Application
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &apps))
	require.Len(t, apps, 1)
	assert.Equal(t, created.ID, apps[0].ID)
	assert.Equal(t, created.MemberID, apps[0].MemberID)
	assert.Equal(t, "grace@example.com", apps[0].Email)

	// 4. GET /applications?member_id=... filters by linked member
	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/applications?member_id="+created.MemberID, nil))
	require.Equal(t, http.StatusOK, w.Code)

	var filtered []Application
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &filtered))
	require.Len(t, filtered, 1)
	assert.Equal(t, created.ID, filtered[0].ID)

	// 5. GET /applications/:id returns exact snapshot
	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/applications/"+created.ID, nil))
	require.Equal(t, http.StatusOK, w.Code)

	var fetchedApp Application
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &fetchedApp))
	assert.Equal(t, created.ID, fetchedApp.ID)
	assert.Equal(t, "First Grace", fetchedApp.PrevChurch)

	// 6. GET /members lists the member created by POST /applications (without status field)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/members", nil))
	require.Equal(t, http.StatusOK, w.Code)
	assert.NotContains(t, w.Body.String(), `"status"`)

	var members []Member
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &members))
	require.Len(t, members, 1)
	assert.Equal(t, created.MemberID, members[0].ID)
	assert.Equal(t, "Grace", members[0].FirstName)
	assert.Equal(t, "Hopper", members[0].LastName)

	// 7. GET /members/:id returns the created member
	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/members/"+created.MemberID, nil))
	require.Equal(t, http.StatusOK, w.Code)

	var member Member
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &member))
	assert.Equal(t, created.MemberID, member.ID)
	assert.Equal(t, "555-0100", member.Phone)
}

func TestValidationAndNotFound(t *testing.T) {
	r := setupTestRouter(t)

	// Missing required first_name / last_name
	req := httptest.NewRequest(http.MethodPost, "/applications", bytes.NewBufferString(`{"email":"a@b.com"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Unknown member ID -> 404
	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/members/"+uuid.NewString(), nil))
	assert.Equal(t, http.StatusNotFound, w.Code)

	// Unknown application ID -> 404
	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/applications/"+uuid.NewString(), nil))
	assert.Equal(t, http.StatusNotFound, w.Code)
}
