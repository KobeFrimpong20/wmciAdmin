package binder

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestRouterWithDB(t *testing.T) (*gin.Engine, *sql.DB) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	db, err := OpenDB(":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	r := gin.New()
	NewHandler(db, testAuthConfig()).RegisterRoutes(r)
	return r, db
}

func TestDeleteMemberEnforcesAdminRBAC(t *testing.T) {
	r := setupTestRouter(t)
	token := loginAsAdmin(t, r)
	created := createTestMember(t, r)
	acceptApplicationAsAdmin(t, r, created.ID, token)

	// Unauthenticated -> 401
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodDelete, "/members/"+created.MemberID, nil))
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	// Valid JWT without admin role -> 403
	nonAdminToken, _, err := testAuthConfig().SignToken("member", time.Now().UTC())
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodDelete, "/members/"+created.MemberID, nil)
	req.Header.Set("Authorization", "Bearer "+nonAdminToken)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestDeleteMemberCascadesApplicationsAndTags(t *testing.T) {
	r, db := setupTestRouterWithDB(t)
	token := loginAsAdmin(t, r)
	created := createTestMember(t, r)
	acceptApplicationAsAdmin(t, r, created.ID, token)

	// Assign extra tags to confirm member_tags also cascade on delete
	wTag := httptest.NewRecorder()
	r.ServeHTTP(wTag, adminPatchRequest("/members/"+created.MemberID+"/tags", token, PatchMemberTagsRequest{
		Add: []string{"pastor", "usher"},
	}))
	require.Equal(t, http.StatusOK, wTag.Code)

	// Delete the accepted member -> 204 No Content
	delReq := httptest.NewRequest(http.MethodDelete, "/members/"+created.MemberID, nil)
	delReq.Header.Set("Authorization", "Bearer "+token)
	wDel := httptest.NewRecorder()
	r.ServeHTTP(wDel, delReq)
	require.Equal(t, http.StatusNoContent, wDel.Code)

	// Member and cascaded application are gone from API
	wMember := httptest.NewRecorder()
	r.ServeHTTP(wMember, adminGetRequest("/members/"+created.MemberID, token))
	assert.Equal(t, http.StatusNotFound, wMember.Code)

	wMembers := httptest.NewRecorder()
	r.ServeHTTP(wMembers, adminGetRequest("/members", token))
	assert.Equal(t, "[]", wMembers.Body.String())

	wApp := httptest.NewRecorder()
	r.ServeHTTP(wApp, adminGetRequest("/applications/"+created.ID, token))
	assert.Equal(t, http.StatusNotFound, wApp.Code)

	wApps := httptest.NewRecorder()
	r.ServeHTTP(wApps, adminGetRequest("/applications?member_id="+created.MemberID, token))
	assert.Equal(t, "[]", wApps.Body.String())

	// Confirm zero orphaned rows in applications or member_tags
	var orphanApps, orphanTags int
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM applications WHERE member_id = ?`, created.MemberID).Scan(&orphanApps))
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM member_tags WHERE member_id = ?`, created.MemberID).Scan(&orphanTags))
	assert.Equal(t, 0, orphanApps)
	assert.Equal(t, 0, orphanTags)

	// Deleting again or deleting an unknown member -> 404 Not Found
	delMissing := httptest.NewRequest(http.MethodDelete, "/members/"+uuid.NewString(), nil)
	delMissing.Header.Set("Authorization", "Bearer "+token)
	wMissing := httptest.NewRecorder()
	r.ServeHTTP(wMissing, delMissing)
	assert.Equal(t, http.StatusNotFound, wMissing.Code)

	// Deleted person can cleanly submit a fresh application later
	reapplied := createTestMember(t, r)
	assert.NotEqual(t, created.MemberID, reapplied.MemberID)
}

func TestFileDBEnforcesForeignKeysAcrossPooledConnections(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "pool.db")
	db, err := OpenDB(dbPath)
	require.NoError(t, err)
	defer db.Close()

	gin.SetMode(gin.TestMode)
	r := gin.New()
	NewHandler(db, testAuthConfig()).RegisterRoutes(r)
	token := loginAsAdmin(t, r)

	created := createTestMember(t, r)
	acceptApplicationAsAdmin(t, r, created.ID, token)

	// Hold connection #1 busy so the next query/delete uses a freshly opened pooled connection #2
	conn1, err := db.Conn(t.Context())
	require.NoError(t, err)
	defer conn1.Close()

	// Check PRAGMA foreign_keys on connection #2
	var fkEnabled int
	require.NoError(t, db.QueryRowContext(t.Context(), `PRAGMA foreign_keys`).Scan(&fkEnabled))
	assert.Equal(t, 1, fkEnabled, "every pooled SQLite connection must have foreign_keys=ON")

	// Delete member via HTTP while conn1 is held open -> forces execution on conn2
	delReq := httptest.NewRequest(http.MethodDelete, "/members/"+created.MemberID, nil)
	delReq.Header.Set("Authorization", "Bearer "+token)
	wDel := httptest.NewRecorder()
	r.ServeHTTP(wDel, delReq)
	require.Equal(t, http.StatusNoContent, wDel.Code)

	var orphanApps, orphanTags int
	require.NoError(t, conn1.QueryRowContext(t.Context(), `SELECT COUNT(*) FROM applications WHERE member_id = ?`, created.MemberID).Scan(&orphanApps))
	require.NoError(t, conn1.QueryRowContext(t.Context(), `SELECT COUNT(*) FROM member_tags WHERE member_id = ?`, created.MemberID).Scan(&orphanTags))
	assert.Equal(t, 0, orphanApps)
	assert.Equal(t, 0, orphanTags)
}
