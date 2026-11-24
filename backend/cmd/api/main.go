package main

import (
	"backend/internal/binder"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env if present; ignore if missing so local dev works out of the box.
	_ = godotenv.Load()

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "binder.db"
	}

	db, err := binder.OpenDB(dbPath)
	if err != nil {
		log.Fatalf("Could not initialize SQLite database: %v", err)
	}
	defer db.Close()

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	h := binder.NewHandler(db)
	h.RegisterRoutes(r)

	log.Printf("Server running on :8080 (SQLite: %s)", dbPath)
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
