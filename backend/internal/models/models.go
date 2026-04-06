package models

import (
	"time"
)

// Users (Staff/Admins)
type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	Password     string    `json:"-"` // Never serialize password hash in API responses
	Role         string    `json:"role"`
	DepartmentID *int      `json:"department_id"` // nil = admin (global), non-nil = lead (scoped)
	CreatedAt    time.Time `json:"created_at"`
}

// Members
type Member struct {
	ID          int          `json:"id"`
	FirstName   string       `json:"first_name"`
	LastName    string       `json:"last_name"`
	Email       *string      `json:"email"` // Pointer: Can be null
	Phone       *string      `json:"phone"`
	Address     *string      `json:"address"`
	Status      string       `json:"status"`
	JoinedAt    time.Time    `json:"joined_at"`
	Departments []Department `json:"departments"`
}

// Departments
type Department struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// Intake represent the JSON payload from the frontend
type IntakeForm struct {
	// Part 1: Personal Information - Member Table data
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Address   string `json:"address"`

	// Part 2 Application Table data
	DateOfBirth   string `json:"date_of_birth"` // Format: YYYY-MM-DD
	MaritalStatus string `json:"marital_status"`
	SpouseName    string `json:"spouse_name"`
	NumChildren   int    `json:"num_children"`

	// Spiritual
	BornAgain     bool   `json:"born_again"`
	WaterBaptized bool   `json:"water_baptized"`
	SpeakTongues  bool   `json:"speak_tongues"`
	PrevChurch    string `json:"prev_church"`

	// Commitments
	AttendanceCommitment bool `json:"attendance_commitment"`
	TitheCommitment      bool `json:"tithe_commitment"`
	PrayerCommitment     bool `json:"prayer_commitment"`
	SoberCommitment      bool `json:"sober_commitment"`
	RespectCommitment    bool `json:"respect_commitment"`
	FaithCommitment      bool `json:"faith_commitment"`

	// Signatures
	MemberSignatureDate *string `json:"member_signature_date"` // Format: YYYY-MM-DD
}

// Applications (The big form)
type Application struct {
	ID       int `json:"id"`
	MemberID int `json:"member_id"`

	// Demographics
	DateOfBirth   time.Time `json:"date_of_birth"`
	MaritalStatus string    `json:"marital_status"`
	SpouseName    string    `json:"spouse_name"`
	NumChildren   int       `json:"num_children"`

	// Spiritual
	BornAgain     bool   `json:"born_again"`
	WaterBaptized bool   `json:"water_baptized"`
	SpeakTongues  bool   `json:"speak_tongues"`
	PrevChurch    string `json:"prev_church"`

	// Commitments
	AttendanceCommitment bool `json:"attendance_commitment"`
	TitheCommitment      bool `json:"tithe_commitment"`
	PrayerCommitment     bool `json:"prayer_commitment"`
	SoberCommitment      bool `json:"sober_commitment"`
	RespectCommitment    bool `json:"respect_commitment"`
	FaithCommitment      bool `json:"faith_commitment"`

	// Signatures
	PastorSignatureDate *time.Time `json:"pastor_signature_date"`
	MemberSignatureDate *time.Time `json:"member_signature_date"`

	// Metadata
	CreatedAt time.Time `json:"created_at"`
}

// Transactions
type Transaction struct {
	ID              int       `json:"id"`
	MemberID        *int      `json:"member_id"` // Can be null if it's a general expense
	Amount          float64   `json:"amount"`
	Category        string    `json:"category"`
	Description     string    `json:"description"`
	TransactionDate time.Time `json:"transaction_date"`
}

// Events
type Event struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	EventDate time.Time `json:"event_date"`
	Category  *string   `json:"category"`
}

// Attendance
type Attendance struct {
	ID          int        `json:"id"`
	EventID     int        `json:"event_id"`
	MemberID    int        `json:"member_id"`
	CheckInTime *time.Time `json:"check_in_time"`
}
