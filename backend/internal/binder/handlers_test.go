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

const (
	testAdminPassword = "test-admin-password"
	testJWTSecret     = "test-jwt-secret-key"
)

func testAuthConfig() AuthConfig {
	return AuthConfig{
		AdminPassword: testAdminPassword,
		JWTSecret:     []byte(testJWTSecret),
		TokenTTL:      time.Hour,
	}
}

func setupTestRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)

	db, err := OpenDB(":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	r := gin.New()
	NewHandler(db, testAuthConfig()).RegisterRoutes(r)
	return r
}

func loginAsAdmin(t *testing.T, r *gin.Engine) string {
	t.Helper()
	body, err := json.Marshal(LoginRequest{Password: testAdminPassword})
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)

	var resp LoginResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.NotEmpty(t, resp.Token)
	return resp.Token
}

func adminGetRequest(path, token string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

func TestApplicationAndMemberLifecycle(t *testing.T) {
	r := setupTestRouter(t)
	token := loginAsAdmin(t, r)

	// 1. Empty lists return [] rather than null
	w := httptest.NewRecorder()
	r.ServeHTTP(w, adminGetRequest("/members", token))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "[]", w.Body.String())

	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminGetRequest("/applications", token))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "[]", w.Body.String())

	// 2. Public POST /applications creates both member and immutable application snapshot
	sigDate := "2026-11-24"
	clientID := uuid.NewString()
	payload := IntakeForm{
		ID:                   clientID,
		FirstName:            "  gRaCe  ",
		LastName:             "  hOpPeR ",
		Email:                "grace@example.com",
		Phone:                "(555) 010-0000",
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
	assert.Equal(t, clientID, created.ID)
	assert.NoError(t, uuid.Validate(created.MemberID))
	assert.Equal(t, "Hopper, Grace", created.FullName)
	assert.Equal(t, "5550100000", created.Phone)
	assert.Equal(t, "1990-12-09", created.DateOfBirth)
	assert.Equal(t, "grace@example.com", created.Email)
	assert.True(t, created.BornAgain)
	assert.True(t, created.TitheCommitment)
	require.NotNil(t, created.MemberSignatureDate)
	assert.Equal(t, sigDate, *created.MemberSignatureDate)

	// 3. GET /applications lists the created snapshot
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminGetRequest("/applications", token))
	require.Equal(t, http.StatusOK, w.Code)

	var apps []Application
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &apps))
	require.Len(t, apps, 1)
	assert.Equal(t, created.ID, apps[0].ID)
	assert.Equal(t, created.MemberID, apps[0].MemberID)
	assert.Equal(t, "Hopper, Grace", apps[0].FullName)

	// 4. GET /applications?member_id=... filters by linked member
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminGetRequest("/applications?member_id="+created.MemberID, token))
	require.Equal(t, http.StatusOK, w.Code)

	var filtered []Application
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &filtered))
	require.Len(t, filtered, 1)
	assert.Equal(t, created.ID, filtered[0].ID)

	// 5. GET /applications/:id returns exact snapshot
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminGetRequest("/applications/"+created.ID, token))
	require.Equal(t, http.StatusOK, w.Code)

	var fetchedApp Application
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &fetchedApp))
	assert.Equal(t, created.ID, fetchedApp.ID)
	assert.Equal(t, "First Grace", fetchedApp.PrevChurch)

	// 6. GET /members lists the member with full_name, date_of_birth, normalized phone
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminGetRequest("/members", token))
	require.Equal(t, http.StatusOK, w.Code)
	assert.NotContains(t, w.Body.String(), `"status"`)

	var members []Member
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &members))
	require.Len(t, members, 1)
	assert.Equal(t, created.MemberID, members[0].ID)
	assert.Equal(t, "Hopper, Grace", members[0].FullName)
	assert.Equal(t, "1990-12-09", members[0].DateOfBirth)
	assert.Equal(t, "5550100000", members[0].Phone)

	// 7. GET /members/:id returns the created member
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminGetRequest("/members/"+created.MemberID, token))
	require.Equal(t, http.StatusOK, w.Code)

	var member Member
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &member))
	assert.Equal(t, created.MemberID, member.ID)
	assert.Equal(t, "Hopper, Grace", member.FullName)
	assert.Equal(t, "5550100000", member.Phone)
}

func TestValidationAndNotFound(t *testing.T) {
	r := setupTestRouter(t)
	token := loginAsAdmin(t, r)

	// Missing required first_name / last_name / id / phone / dob -> 400
	req := httptest.NewRequest(http.MethodPost, "/applications", bytes.NewBufferString(`{"email":"a@b.com"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Missing required client UUID -> 400
	req = httptest.NewRequest(http.MethodPost, "/applications", bytes.NewBufferString(`{"first_name":"Grace","last_name":"Hopper","phone":"555-0100","date_of_birth":"1990-12-09"}`))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Invalid client UUID -> 400
	req = httptest.NewRequest(http.MethodPost, "/applications", bytes.NewBufferString(`{"id":"not-a-uuid","first_name":"Grace","last_name":"Hopper","phone":"555-0100","date_of_birth":"1990-12-09"}`))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Missing / non-digit phone -> 400
	req = httptest.NewRequest(http.MethodPost, "/applications", bytes.NewBufferString(`{"id":"`+uuid.NewString()+`","first_name":"Grace","last_name":"Hopper","phone":"---","date_of_birth":"1990-12-09"}`))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Invalid date_of_birth format -> 400
	req = httptest.NewRequest(http.MethodPost, "/applications", bytes.NewBufferString(`{"id":"`+uuid.NewString()+`","first_name":"Grace","last_name":"Hopper","phone":"555-0100","date_of_birth":"12/09/1990"}`))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Missing one or more mandatory commitments -> 400
	incompleteCommitments, err := json.Marshal(IntakeForm{
		ID:                   uuid.NewString(),
		FirstName:            "Grace",
		LastName:             "Hopper",
		Phone:                "555-0100",
		DateOfBirth:          "1990-12-09",
		AttendanceCommitment: true,
		TitheCommitment:      true,
		PrayerCommitment:     true,
		SoberCommitment:      false,
		RespectCommitment:    true,
		FaithCommitment:      true,
	})
	require.NoError(t, err)
	req = httptest.NewRequest(http.MethodPost, "/applications", bytes.NewReader(incompleteCommitments))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Unknown member ID -> 404 (authenticated admin)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminGetRequest("/members/"+uuid.NewString(), token))
	assert.Equal(t, http.StatusNotFound, w.Code)

	// Unknown application ID -> 404 (authenticated admin)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, adminGetRequest("/applications/"+uuid.NewString(), token))
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestCreateApplicationIdempotencyAndCompoundKey(t *testing.T) {
	r := setupTestRouter(t)
	token := loginAsAdmin(t, r)

	clientID := uuid.NewString()
	payload := IntakeForm{
		ID:                   clientID,
		FirstName:            "Ada",
		LastName:             "Lovelace",
		Email:                "ada@example.com",
		Phone:                "(555) 234-5678",
		DateOfBirth:          "1985-12-10",
		AttendanceCommitment: true,
		TitheCommitment:      true,
		PrayerCommitment:     true,
		SoberCommitment:      true,
		RespectCommitment:    true,
		FaithCommitment:      true,
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	// 1. First submission creates member + application (no auth required)
	req1 := httptest.NewRequest(http.MethodPost, "/applications", bytes.NewReader(body))
	req1.Header.Set("Content-Type", "application/json")
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)
	require.Equal(t, http.StatusCreated, w1.Code)

	var first Application
	require.NoError(t, json.Unmarshal(w1.Body.Bytes(), &first))
	assert.Equal(t, clientID, first.ID)
	assert.Equal(t, "Lovelace, Ada", first.FullName)
	assert.Equal(t, "5552345678", first.Phone)

	// 2. Duplicate submission with the same client UUID -> 409 Conflict
	req2 := httptest.NewRequest(http.MethodPost, "/applications", bytes.NewReader(body))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	require.Equal(t, http.StatusConflict, w2.Code)

	// 3. Different client UUID, same person with differently formatted name & phone -> 409 Conflict
	duplicatePerson := IntakeForm{
		ID:                   uuid.NewString(),
		FirstName:            "  ADA ",
		LastName:             " lovelace ",
		Phone:                "555.234.5678",
		DateOfBirth:          "1985-12-10",
		AttendanceCommitment: true,
		TitheCommitment:      true,
		PrayerCommitment:     true,
		SoberCommitment:      true,
		RespectCommitment:    true,
		FaithCommitment:      true,
	}
	dupBody, err := json.Marshal(duplicatePerson)
	require.NoError(t, err)

	req3 := httptest.NewRequest(http.MethodPost, "/applications", bytes.NewReader(dupBody))
	req3.Header.Set("Content-Type", "application/json")
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, req3)
	require.Equal(t, http.StatusConflict, w3.Code)

	// 4. Confirm only 1 member and 1 application exist (admin view)
	wMembers := httptest.NewRecorder()
	r.ServeHTTP(wMembers, adminGetRequest("/members", token))
	require.Equal(t, http.StatusOK, wMembers.Code)
	var members []Member
	require.NoError(t, json.Unmarshal(wMembers.Body.Bytes(), &members))
	assert.Len(t, members, 1)

	wApps := httptest.NewRecorder()
	r.ServeHTTP(wApps, adminGetRequest("/applications", token))
	require.Equal(t, http.StatusOK, wApps.Code)
	var apps []Application
	require.NoError(t, json.Unmarshal(wApps.Body.Bytes(), &apps))
	assert.Len(t, apps, 1)
}

func TestMemberOrderingByFullName(t *testing.T) {
	r := setupTestRouter(t)
	token := loginAsAdmin(t, r)

	entries := []IntakeForm{
		{
			ID: uuid.NewString(), FirstName: "Zara", LastName: "Mensah", Phone: "555-0001", DateOfBirth: "1992-03-14",
			AttendanceCommitment: true, TitheCommitment: true, PrayerCommitment: true,
			SoberCommitment: true, RespectCommitment: true, FaithCommitment: true,
		},
		{
			ID: uuid.NewString(), FirstName: "Daniel", LastName: "Boateng", Phone: "555-0002", DateOfBirth: "1988-07-21",
			AttendanceCommitment: true, TitheCommitment: true, PrayerCommitment: true,
			SoberCommitment: true, RespectCommitment: true, FaithCommitment: true,
		},
		{
			ID: uuid.NewString(), FirstName: "Aaron", LastName: "Mensah", Phone: "555-0003", DateOfBirth: "1995-11-02",
			AttendanceCommitment: true, TitheCommitment: true, PrayerCommitment: true,
			SoberCommitment: true, RespectCommitment: true, FaithCommitment: true,
		},
	}

	for _, entry := range entries {
		b, err := json.Marshal(entry)
		require.NoError(t, err)
		req := httptest.NewRequest(http.MethodPost, "/applications", bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		require.Equal(t, http.StatusCreated, w.Code)
	}

	w := httptest.NewRecorder()
	r.ServeHTTP(w, adminGetRequest("/members", token))
	require.Equal(t, http.StatusOK, w.Code)

	var members []Member
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &members))
	require.Len(t, members, 3)
	assert.Equal(t, "Boateng, Daniel", members[0].FullName)
	assert.Equal(t, "Mensah, Aaron", members[1].FullName)
	assert.Equal(t, "Mensah, Zara", members[2].FullName)
}
