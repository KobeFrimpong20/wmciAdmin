package handlers

import (
	"backend/internal/models"
	"backend/internal/repository"
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	DB        repository.DatabaseRepo
	JWTSecret string
}

func NewHandler(db repository.DatabaseRepo, secret string) *Handler {
	return &Handler{
		DB:        db,
		JWTSecret: secret,
	}
}

func (h *Handler) CreateMember(c *gin.Context) {
	var newMember models.Member

	// Read JSON
	if err := c.ShouldBindJSON(&newMember); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"Error occured while reading JSON: ": err.Error()})
		return
	}

	// Call the repo
	newID, err := h.DB.CreateMember(newMember)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"Error occured while creating member: ": err.Error()})
		return
	}

	// Respond
	newMember.ID = newID
	c.JSON(http.StatusCreated, newMember)
}

func (h *Handler) ImportMembers(c *gin.Context) {
	var payload []models.Member

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"Error occured while reading JSON: ": err.Error()})
		return
	}

	go func() {
		err := h.DB.ImportMembers(payload)
		if err != nil {
			println("Background Bulk Import Failed")
		} else {
			println("Background Bulk Import Successful")
		}
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Import Process Initiated, Check server logs for status",
		"count":   len(payload),
	})
}

func (h *Handler) GetMemberByID(c *gin.Context) {
	idStr := c.Param("id")

	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"Error occured while reading JSON: ": err.Error()})
		return
	}

	member, err := h.DB.GetMemberByID(id)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"Error occured while getting member: ": "Member not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"Error occured while getting member: ": err.Error()})
		return
	}
	c.JSON(http.StatusOK, member)
}

func (h *Handler) GetAllMembers(c *gin.Context) {
	members, err := h.DB.GetAllMembers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"Error occured while getting members: ": err.Error()})
		return
	}
	c.JSON(http.StatusOK, members)
}

func (h *Handler) UpdateMember(c *gin.Context) {
	idStr := c.Param("id")

	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"Error occured while reading JSON: ": err.Error()})
		return
	}

	var payload models.Member
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"Error occured while reading JSON: ": err.Error()})
		return
	}

	payload.ID = id

	err = h.DB.UpdateMember(payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"Error occured while updating member: ": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member updated successfully"})
}

func (h *Handler) DeleteMember(c *gin.Context) {
	idStr := c.Param("id")

	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"Error occured while reading JSON: ": err.Error()})
		return
	}

	err = h.DB.DeleteMember(id)
	if err != nil {
		if err.Error() == "member not found" {
			c.JSON(http.StatusNotFound, gin.H{"Error occured while deleting member: ": "Member not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"Error occured while deleting member: ": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member deleted successfully"})
}

func (h *Handler) GetAllDepartments(c *gin.Context) {
	departments, err := h.DB.GetAllDepartments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"Error occured while getting departments: ": err.Error()})
		return
	}
	c.JSON(http.StatusOK, departments)
}

func (h *Handler) GetMembersByDepartmentID(c *gin.Context) {

	deptIDStr := c.Param("id")
	deptID, err := strconv.Atoi(deptIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"Error occured while reading JSON: ": err.Error()})
		return
	}

	members, err := h.DB.GetMembersByDepartmentID(deptID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"Error occured while getting members: ": err.Error()})
		return
	}
	c.JSON(http.StatusOK, members)
}

func (h *Handler) GetUserByEmail(c *gin.Context) {
	email := c.Param("email")

	user, err := h.DB.GetUserByEmail(email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"Error occured while getting user: ": err.Error()})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *Handler) Login(c *gin.Context) {
	var loginRequest struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&loginRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"Error occured while reading JSON: ": err.Error()})
		return
	}

	user, err := h.DB.GetUserByEmail(loginRequest.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"Error occured while getting user: ": "Invalid credentials"})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginRequest.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"Error occured while getting user: ": "Invalid credentials"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"subject": user.ID,
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(h.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"Error occured while getting user: ": "Invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"email": user.Email,
			"role":  user.Role,
			"id":    user.ID,
		},
	})
}

func (h *Handler) SubmitApplication(c *gin.Context) {
	var application models.IntakeForm

	if err := c.ShouldBindJSON(&application); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"Error occured while reading JSON: ": err.Error()})
		return
	}

	err := h.DB.SubmitIntake(application)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"Error occured while submitting application: ": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Application submitted successfully"})
}

func (h *Handler) ApproveApplication(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Application ID"})
		return
	}

	err = h.DB.ApproveApplication(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve application"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Application approved and signed by pastor"})
}
