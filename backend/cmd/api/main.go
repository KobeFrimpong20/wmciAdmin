package main

import (
	"backend/internal/binder"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env if present; ignore if missing so local dev works out of the box.
	_ = godotenv.Load()

	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		log.Fatal("ADMIN_PASSWORD environment variable is required (see backend/.env.example)")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required (see backend/.env.example)")
	}

	tokenTTL := binder.DefaultTokenTTL
	if rawTTL := os.Getenv("JWT_TTL_HOURS"); rawTTL != "" {
		hours, err := strconv.Atoi(rawTTL)
		if err != nil || hours <= 0 {
			log.Fatalf("JWT_TTL_HOURS must be a positive integer, got %q", rawTTL)
		}
		tokenTTL = time.Duration(hours) * time.Hour
	}

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
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	authCfg := binder.AuthConfig{
		AdminPassword: adminPassword,
		JWTSecret:     []byte(jwtSecret),
		TokenTTL:      tokenTTL,
	}

	h := binder.NewHandler(db, authCfg)
	h.RegisterRoutes(r)

	log.Printf("Server running on :8080 (SQLite: %s)", dbPath)
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
