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
