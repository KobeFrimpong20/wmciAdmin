package repository

import (
	"backend/internal/models"
	"context"
	"database/sql"
	"time"
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

func (p *PostgresDB) BulkCreateMembers(members []models.Member) error {

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
