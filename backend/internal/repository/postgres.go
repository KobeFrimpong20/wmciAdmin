package repository

import (
	"backend/internal/models"
	"context"
	"database/sql"
	"time"

	"github.com/lib/pq"
)

type PostgresDB struct {
	db *sql.DB
}

func NewPostgresDB(db *sql.DB) *PostgresDB {
	return &PostgresDB{db: db}
}

func (p *PostgresDB) CreateMember(m models.Member) (int, error) {
	sqlStatement := `INSERT INTO members (first_name, last_name, email, phone, address, status, joined_at)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	RETURNING id`

	var newID int

	err := p.db.QueryRow(sqlStatement,
		m.FirstName,
		m.LastName,
		m.Email,
		m.Phone,
		m.Address,
		m.Status,
		m.JoinedAt,
	).Scan(&newID)

	if err != nil {
		return 0, err
	}

	return newID, nil
}

func (p *PostgresDB) GetAllMembers() ([]models.Member, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
	SELECT id, first_name, last_name, email, phone, address, status, joined_at
	FROM members
	ORDER BY last_name, first_name
	`

	rows, err := p.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []models.Member

	for rows.Next() {
		var m models.Member

		err := rows.Scan(
			&m.ID,
			&m.FirstName,
			&m.LastName,
			&m.Email,
			&m.Phone,
			&m.Address,
			&m.Status,
			&m.JoinedAt,
		)
		if err != nil {
			return nil, err
		}
		members = append(members, m)
	}

	return members, nil
}

func (p *PostgresDB) ImportMembers(members []models.Member) error {

	tx, err := p.db.Begin()

	if err != nil {
		return err
	}

	defer tx.Rollback()

	query := `
	INSERT INTO members (first_name, last_name, email, phone, address, status, joined_at)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	for _, m := range members {
		_, err := tx.Exec(query,
			m.FirstName,
			m.LastName,
			m.Email,
			m.Phone,
			m.Address,
			m.Status,
			m.JoinedAt,
		)

		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (p *PostgresDB) GetMemberByID(id int) (*models.Member, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
	SELECT
		m.id, m.first_name, m.last_name, m.email, m.phone, m.address, m.status, m.joined_at,
		COALESCE(ARRAY_AGG(d.name) FILTER (WHERE d.name IS NOT NULL), '{}') as department_names
	FROM members m
	LEFT JOIN member_departments md ON m.id = md.member_id
	LEFT JOIN departments d ON md.department_id = d.id
	WHERE m.id = $1
	GROUP BY m.id
	`

	var member models.Member
	var departmentNames []string

	err := p.db.QueryRowContext(ctx, query, id).Scan(
		&member.ID,
		&member.FirstName,
		&member.LastName,
		&member.Email,
		&member.Phone,
		&member.Address,
		&member.Status,
		&member.JoinedAt,
		pq.Array(&departmentNames),
	)

	if err != nil {
		return nil, err
	}

	for _, name := range departmentNames {
		member.Departments = append(member.Departments, models.Department{Name: name})
	}

	return &member, nil
}
