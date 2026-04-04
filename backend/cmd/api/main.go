package main

import (
	"backend/internal/handlers"
	"backend/internal/middleware"
	"backend/internal/repository"
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

type Config struct {
	DB repository.DatabaseRepo
}

func main() {
	// 1. Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// 2. Open the connection
	dsn := os.Getenv("DB_DSN")
	secret := os.Getenv("JWT_SECRET")
	conn, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("Could not open connection: ", err)
	}
	defer conn.Close()

	// Initialize repository )
	repo := repository.NewPostgresDB(conn)

	// Inject the repo into the config
	h := handlers.NewHandler(repo, secret)

	// Setup router
	r := gin.Default()

	// CONFIG: Allow the Frontend to talk to us
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"}, // Add your frontend ports here
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Define Routes
	// Public Routes (The Lobby)
	r.POST("/login", h.Login)
	r.PUT("/applications/:id/approve", h.ApproveApplication)
	r.POST("/applications", h.SubmitApplication)

	// Protected Routes (The Club)
	protected := r.Group("/")
	protected.Use(middleware.AuthMiddleware(secret))
	{
		protected.POST("/members", h.CreateMember)
		protected.GET("/members", h.GetAllMembers)
		protected.POST("/members/import", h.ImportMembers)
		protected.GET("/members/:id", h.GetMemberByID)
		protected.GET("/members/:id/application", h.GetMemberApplication)
		protected.PUT("/members/:id/application", h.UpdateApplication)
		protected.PUT("/members/:id", h.UpdateMember)
		protected.DELETE("/members/:id", h.DeleteMember)
		protected.GET("/departments", h.GetAllDepartments)
		protected.GET("/members/departments/:id", h.GetMembersByDepartmentID)
		protected.GET("/users/:email", h.GetUserByEmail)
	}

	r.GET("/debug/hash/:password", func(c *gin.Context) {
		password := c.Param("password")

		hashedBytes, _ := bcrypt.GenerateFromPassword([]byte(password), 12)
		c.JSON(http.StatusOK, gin.H{
			"password": password,
			"hashed":   string(hashedBytes),
		})
	})

	// Run the server
	log.Println("Server running on :8080")
	r.Run(":8080")
}
