package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

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
	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		log.Fatal("Could not open connection: ", err)
	}
	defer db.Close()

	// 3. Ping the database to test the connection
	err = db.Ping()
	if err != nil {
		log.Fatal("Could not connect to database: ", err)
	}

	fmt.Println("------------------------------------------------")
	fmt.Println("SUCCESS! Sucessfully connected to the database!")
	fmt.Println("------------------------------------------------")

	r := gin.Default()
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message":         "pong",
			"database_status": "connected",
		})
	})

	r.Run(":8080")
}
