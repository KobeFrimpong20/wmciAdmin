package handlers

import (
	"backend/internal/models"
	"backend/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	DB repository.DatabaseRepo
}

func NewHandler(repo repository.DatabaseRepo) *Handler {
	return &Handler{DB: repo}
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

func (h *Handler) GetAllMembers(c *gin.Context) {
	members, err := h.DB.GetAllMembers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"Error occured while getting members: ": err.Error()})
		return
	}
	c.JSON(http.StatusOK, members)
}

func (h *Handler) BulkCreateMembers(c *gin.Context) {
	var payload []models.Member

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"Error occured while reading JSON: ": err.Error()})
		return
	}

	go func() {
		err := h.DB.BulkCreateMembers(payload)
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
