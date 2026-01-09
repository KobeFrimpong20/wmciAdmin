package repository

import "backend/internal/models"

type DatabaseRepo interface {
	// --- Members ---
	CreateMember(m models.Member) (int, error)
	GetMemberByID(id int) (*models.Member, error)
	GetAllMembers() ([]models.Member, error)
	ImportMembers(members []models.Member) error
	UpdateMember(m models.Member) error
	// DeleteMember(id int) error

	// // --- Applications ---
	// CreateApplication(a models.Application) (int, error)
	// GetApplicationByMemberID(memberID int) (models.Application, error)
	// UpdateApplication(a models.Application) error

	// // --- Transactions ---
	// AddTransaction(t models.Transaction) (int, error)
	// GetTransactionsByMemberID(memberID int) ([]models.Transaction, error)
	// GetTransactionsByDateRange(startDate, endDate string) ([]models.Transaction, error)

	// // --- Events ---
	// AddEvent(e models.Event) (int, error)
	// GetAllEvents() ([]models.Event, error)

	// // --- Attendance ---
	// AddAttendance(a models.Attendance) (int, error)
	// GetAttendanceByMemberID(memberID int) ([]models.Attendance, error)
	// GetAttendeesForEvent(eventID int) ([]models.Attendance, error)

	// // --- Departments ---
	// GetAllDepartments() ([]models.Department, error)
	// AddMemberToDepartment(m models.Member, departmentID int) error
	// RemoveMemberFromDepartment(m models.Member, departmentID int) error

	// // --- Users (Auth) ---
	// CreateUser(u models.User) (int, error)
	// GetUserByEmail(email string) (models.User, error)
}
