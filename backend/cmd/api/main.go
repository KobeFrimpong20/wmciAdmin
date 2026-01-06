package main

import (
	"backend/internal/handlers"
	"backend/internal/repository"
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
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
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	conn, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Could not open connection: ", err)
	}
	defer conn.Close()

	// Initialize repository )
	repo := repository.NewPostgresDB(conn)

	// Inject the repo into the config
	h := handlers.NewHandler(repo)

	// Setup router
	r := gin.Default()

	// Define Routes
	r.POST("/members", h.CreateMember)
	r.GET("/members", h.GetAllMembers)
	r.POST("/members/import", h.BulkCreateMembers)
	r.GET("/members/:memberID", h.GetMemberByID)

	// Run the server
	log.Println("Server running on :8080")
	r.Run(":8080")
}
