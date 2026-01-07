package handlers

import (
	"backend/internal/models"
	"backend/internal/repository"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestGetMemberByID(t *testing.T) {

	// Set up the mock repository
	mockRepo := repository.NewMockDB()
	h := NewHandler(mockRepo)

	// Set up the gin router
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.GET("/members/:memberID", h.GetMemberByID)

	// ----------------------------------------
	// CASE 1: Valid ID (Member exists)
	// ----------------------------------------

	req, _ := http.NewRequest("GET", "/members/67", nil)
	w := httptest.NewRecorder() // captures response
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Check Body of response
	var response models.Member
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, response.FirstName, "Dummy")

	// ----------------------------------------
	// CASE 2: Invalid ID (Member does not exist)
	// ----------------------------------------

	req, _ = http.NewRequest("GET", "/members/123", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

}

func TestGetAllMembers(t *testing.T) {

	// Set up the mock repository
	mockRepo := repository.NewMockDB()
	h := NewHandler(mockRepo)

	// Set up the gin router
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.GET("/members", h.GetAllMembers)

	// ----------------------------------------
	// CASE 1: Valid ID (Member exists)
	// ----------------------------------------

	req, _ := http.NewRequest("GET", "/members", nil)
	w := httptest.NewRecorder() // captures response
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Check Body of response
	var response []models.Member
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, 2, len(response))
	assert.Equal(t, response[0].FirstName, "Dummy")

	// ----------------------------------------
	// CASE 2: Invalid ID (Member does not exist)
	// ----------------------------------------

	mockRepo.ForceError = true
	req, _ = http.NewRequest("GET", "/members", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestCreateMember(t *testing.T) {

	// Set up the mock repository
	mockRepo := repository.NewMockDB()
	h := NewHandler(mockRepo)

	// Set up the gin router
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.POST("/members", h.CreateMember)

	// ----------------------------------------
	// CASE 1: Member Created Successfully
	// ----------------------------------------

	requestBody := `
	{
		"first_name": "Dummy",
		"last_name": "Member",
		"email": "dummy@member.com",
		"phone": "1234567890",
		"address": "123 Main St",
		"status": "Active",
		"joined_at": "2022-01-01T00:00:00Z"
	}
	`

	req, _ := http.NewRequest("POST", "/members", bytes.NewBuffer([]byte(requestBody)))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	// Check Body of response
	var response models.Member
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, response.ID, 67)

	// ----------------------------------------
	// CASE 2: Member Creation Failed
	// ----------------------------------------

	mockRepo.ForceError = true
	req, _ = http.NewRequest("POST", "/members", bytes.NewBuffer([]byte(requestBody)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestImportMembers(t *testing.T) {

	// Set up the mock repository
	mockRepo := repository.NewMockDB()
	h := NewHandler(mockRepo)

	// Set up the gin router
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.POST("/members/import", h.ImportMembers)

	// ----------------------------------------
	// CASE 1: Members Created Successfully
	// ----------------------------------------

	requestBody := `
	[
		{
			"first_name": "Dummy",
			"last_name": "Member",
			"email": "dummy@member.com",
			"phone": "1234567890",
			"address": "123 Main St",
			"status": "Active",
			"joined_at": "2022-01-01T00:00:00Z"
		}, 
		{
			"first_name": "Dummy2",
			"last_name": "Member2",
			"email": "dummy2@member.com",
			"phone": "1234567890",
			"address": "123 Main St",
			"status": "Active",
			"joined_at": "2022-01-01T00:00:00Z"
		}
	]
	`

	req, _ := http.NewRequest("POST", "/members/import", bytes.NewBuffer([]byte(requestBody)))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusAccepted, w.Code)

	// ----------------------------------------
	// CASE 2: Members Creation Failed
	// ----------------------------------------

	badJSON := `{ "first_name": "Dummy", "last_name": "Member" }`

	req, _ = http.NewRequest("POST", "/members/import", bytes.NewBuffer([]byte(badJSON)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
