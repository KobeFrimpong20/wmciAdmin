package repository

import (
	"backend/internal/models"
	"errors"
	"time"
)

type MockDB struct {
	ForceError bool
}

func NewMockDB() *MockDB {
	return &MockDB{}
}

func (m *MockDB) GetMemberByID(id int) (*models.Member, error) {
	// 67 is the only valid ID every other ID will return an error
	if id == 67 {
		userEmail := "dummy.member@example.com"
		return &models.Member{
			ID:        67,
			FirstName: "Dummy",
			LastName:  "Member",
			Email:     &userEmail,
			Departments: []models.Department{
				{Name: "Choir"},
			},
			Status:   "Active",
			JoinedAt: time.Now(),
		}, nil
	}

	// If the ID is not 67, return an error
	return nil, errors.New("member not found")
}

func (m *MockDB) GetAllMembers() ([]models.Member, error) {

	if m.ForceError {
		return nil, errors.New("failed to get all members")
	}

	dummyEmailOne := "dummy.member@example.com"
	dummyEmailTwo := "dummy.member2@example.com"
	return []models.Member{
		{
			ID:        67,
			FirstName: "Dummy",
			LastName:  "Member",
			Email:     &dummyEmailOne,
			Departments: []models.Department{
				{Name: "Choir"},
			},
			Status:   "Active",
			JoinedAt: time.Now(),
		},
		{
			ID:        69,
			FirstName: "Dummy",
			LastName:  "Member",
			Email:     &dummyEmailTwo,
			Departments: []models.Department{
				{Name: "Choir"},
			},
			Status:   "Active",
			JoinedAt: time.Now(),
		},
	}, nil
}

func (m *MockDB) CreateMember(member models.Member) (int, error) {
	if m.ForceError {
		return 0, errors.New("failed to create member")
	}
	return 67, nil
}

func (m *MockDB) ImportMembers(members []models.Member) error {
	if m.ForceError {
		return errors.New("failed to bulk create members")
	}
	return nil
}

func (m *MockDB) UpdateMember(member models.Member) error {
	if m.ForceError {
		return errors.New("failed to update member")
	}
	return nil
}

func (m *MockDB) DeleteMember(id int) error {
	if m.ForceError {
		return errors.New("failed to delete member")
	}
	return nil
}

func (m *MockDB) GetAllDepartments() ([]models.Department, error) {
	if m.ForceError {
		return nil, errors.New("failed to get all departments")
	}
	return []models.Department{
		{Name: "Choir"},
		{Name: "Music"},
		{Name: "Youth"},
	}, nil
}

func (m *MockDB) GetMembersByDepartmentID(departmentID int) ([]models.Member, error) {
	if m.ForceError {
		return nil, errors.New("failed to get members by department ID")
	}
	dummyEmail := "dummy.member@example.com"
	return []models.Member{
		{
			ID:        67,
			FirstName: "Dummy",
			LastName:  "Member",
			Email:     &dummyEmail,
			Departments: []models.Department{
				{Name: "Choir"},
			},
			Status:   "Active",
			JoinedAt: time.Now(),
		},
	}, nil
}

func (m *MockDB) GetUserByEmail(email string) (*models.User, error) {
	if m.ForceError {
		return nil, errors.New("failed to get user by email")
	}
	return &models.User{
		ID:    67,
		Email: "dummy.member@example.com",
		// bcrypt hash of "password" — needed for TestLogin to exercise bcrypt.CompareHashAndPassword
		Password: "$2a$12$hN0qFxY2xRnbOKgcvgeh3ezhr1dACHa4fieuIauHbo8BrO.gHWfay",
		Role:     "admin",
	}, nil
}

func (m *MockDB) Login(email string, password string) (*models.User, error) {
	if m.ForceError {
		return nil, errors.New("failed to login")
	}
	return &models.User{
		ID:    67,
		Email: "dummy.member@example.com",
		Role:  "admin",
	}, nil
}

func (m *MockDB) SubmitIntake(form models.IntakeForm) error {
	return nil
}

func (m *MockDB) ApproveApplication(appID int) error {
	return nil
}

func (m *MockDB) GetApplicationByMemberID(memberID int) (*models.Application, error) {
	if m.ForceError {
		return nil, errors.New("failed to get application")
	}
	
	if memberID != 67 {
		return nil, errors.New("application not found")
	}

	return &models.Application{
		ID:                   1,
		MemberID:             67,
		DateOfBirth:          time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC),
		MaritalStatus:        "Single",
		SpouseName:           "",
		NumChildren:          0,
		BornAgain:            true,
		WaterBaptized:        true,
		SpeakTongues:         false,
		PrevChurch:           "Previous Church Name",
		AttendanceCommitment: true,
		TitheCommitment:      true,
		PrayerCommitment:     true,
		SoberCommitment:      true,
		RespectCommitment:    true,
		FaithCommitment:      true,
		MemberSignatureDate:  nil,
		PastorSignatureDate:  nil,
		CreatedAt:            time.Now(),
	}, nil
}

func (m *MockDB) UpdateApplication(a models.Application) error {
	if m.ForceError {
		return errors.New("failed to update application")
	}
	return nil
}
