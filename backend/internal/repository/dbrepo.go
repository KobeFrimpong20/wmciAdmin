package repository

import "backend/internal/models"

type DatabaseRepo interface {
	// --- Members ---
	CreateMember(m models.Member) (int, error)
	GetMemberByID(id int) (*models.Member, error)
	GetMembersByDepartmentID(departmentID int) ([]models.Member, error)
	GetAllMembers() ([]models.Member, error)
	ImportMembers(members []models.Member) error
	UpdateMember(m models.Member) error
	DeleteMember(id int) error

	// // --- Applications ---
	SubmitIntake(form models.IntakeForm) error
	ApproveApplication(appID int) error
	// CreateApplication(a models.Application) (int, error)
	GetApplicationByMemberID(memberID int) (*models.Application, error)
	UpdateApplication(a models.Application) error

	// // --- Departments ---
	GetAllDepartments() ([]models.Department, error)

	// // --- Users (Auth) ---
	GetUserByEmail(email string) (*models.User, error)
}
