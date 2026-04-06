package repository

import (
	"backend/internal/models"
	"context"
	"database/sql"
	"errors"
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

func (p *PostgresDB) UpdateMember(member models.Member) error {
	tx, err := p.db.Begin()
	if err != nil {
		return err
	}

	defer tx.Rollback()

	updateMemberQuery := `
	UPDATE members
	SET first_name = $1,
	last_name = $2,
	email = $3,
	phone = $4,
	address = $5,
	status = $6,
	joined_at = $7
	WHERE id = $8
	`

	_, err = tx.Exec(updateMemberQuery,
		member.FirstName,
		member.LastName,
		member.Email,
		member.Phone,
		member.Address,
		member.Status,
		member.JoinedAt,
		member.ID,
	)
	if err != nil {
		return err
	}

	removeOldDeptQuery := `
	DELETE
	FROM member_departments
	WHERE member_id = $1
	`

	addNewDeptQuery := `
	INSERT INTO member_departments (member_id, department_id)
	VALUES ($1, $2)
	`

	_, err = tx.Exec(removeOldDeptQuery, member.ID)
	if err != nil {
		return err
	}

	for _, dept := range member.Departments {
		_, err = tx.Exec(addNewDeptQuery, member.ID, dept.ID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (p *PostgresDB) DeleteMember(id int) error {

	tx, err := p.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	deleteDeptQuery := `
	DELETE
	FROM member_departments
	WHERE member_id = $1
	`

	// Delete the dependencies first
	_, err = tx.Exec(deleteDeptQuery, id)
	if err != nil {
		return err
	}

	deleteMemberQuery := `
	DELETE
	FROM members
	WHERE id = $1
	`

	// Delete the member
	result, err := tx.Exec(deleteMemberQuery, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("member not found")
	}

	return tx.Commit()
}

func (p *PostgresDB) GetAllDepartments() ([]models.Department, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
	SELECT id, name
	FROM departments
	ORDER BY name
	`

	rows, err := p.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var departments []models.Department

	for rows.Next() {
		var dept models.Department

		err := rows.Scan(
			&dept.ID,
			&dept.Name,
		)
		if err != nil {
			return nil, err
		}
		departments = append(departments, dept)
	}

	return departments, nil
}

func (p *PostgresDB) GetMembersByDepartmentID(departmentID int) ([]models.Member, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
	SELECT m.id, m.first_name, m.last_name, m.email, m.phone, m.address, m.status, m.joined_at
	FROM members m
	INNER JOIN member_departments md ON m.id = md.member_id
	WHERE md.department_id = $1
	GROUP BY m.last_name, m.first_name
	`

	rows, err := p.db.QueryContext(ctx, query, departmentID)
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

func (p *PostgresDB) GetUserByEmail(email string) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
	SELECT id, email, password_hash, role, department_id
	FROM users
	WHERE email = $1
	`

	var user models.User
	var hashedPassword string

	row := p.db.QueryRowContext(ctx, query, email)
	err := row.Scan(
		&user.ID,
		&user.Email,
		&hashedPassword,
		&user.Role,
		&user.DepartmentID,
	)
	if err != nil {
		return nil, err
	}

	user.Password = hashedPassword
	return &user, nil
}

func (p *PostgresDB) SubmitIntake(form models.IntakeForm) error {

	tx, err := p.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var memberID int
	queryMember := `
		INSERT INTO members (first_name, last_name, email, phone, address, status, joined_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`

	err = tx.QueryRow(queryMember,
		form.FirstName,
		form.LastName,
		form.Email,
		form.Phone,
		form.Address,
		"pending",
		time.Now(),
	).Scan(&memberID)

	if err != nil {
		return err
	}

	queryApp := `
		INSERT INTO applications (
			member_id, date_of_birth, marital_status, spouse_name, num_children,
			born_again, water_baptized, speak_tongues, prev_church,
			attendance_commitment, tithe_commitment, prayer_commitment,
			sober_commitment, respect_commitment, faith_commitment,
		member_signature_date
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`

	_, err = tx.Exec(queryApp,
		memberID,
		form.DateOfBirth,
		form.MaritalStatus,
		form.SpouseName,
		form.NumChildren,
		form.BornAgain,
		form.WaterBaptized,
		form.SpeakTongues,
		form.PrevChurch,
		form.AttendanceCommitment,
		form.TitheCommitment,
		form.PrayerCommitment,
		form.SoberCommitment,
		form.RespectCommitment,
		form.FaithCommitment,
		form.MemberSignatureDate,
	)

	if err != nil {
		return err
	}

	return tx.Commit()
}

func (p *PostgresDB) ApproveApplication(appID int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// We use a Transaction because we might want to update the Member status too
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Update the Application (Sign & Approve)
	queryApp := `
        UPDATE applications 
        SET status = 'approved', pastor_signature_date = CURRENT_DATE
        WHERE id = $1
        RETURNING member_id
    `
	var memberID int
	err = tx.QueryRowContext(ctx, queryApp, appID).Scan(&memberID)
	if err != nil {
		return err // Likely appID not found
	}

	// 2. Update the Member Status (Officially join the church)
	queryMember := `UPDATE members SET status = 'active' WHERE id = $1`
	_, err = tx.ExecContext(ctx, queryMember, memberID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (p *PostgresDB) GetApplicationByID(appID int) (*models.Application, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
	SELECT id, member_id, date_of_birth, marital_status, spouse_name, num_children,
	born_again, water_baptized, speak_tongues, prev_church,
	attendance_commitment, tithe_commitment, prayer_commitment,
	sober_commitment, respect_commitment, faith_commitment,
	pastor_signature_date, member_signature_date, created_at
	FROM applications
	WHERE id = $1
	`

	var app models.Application
	var sqlSpouseName sql.NullString
	var sqlPrevChurch sql.NullString
	var sqlPastorDate sql.NullTime
	var sqlMemberDate sql.NullTime
	var sqlDOB sql.NullTime

	err := p.db.QueryRowContext(ctx, query, appID).Scan(
		&app.ID,
		&app.MemberID,
		&sqlDOB,
		&app.MaritalStatus,
		&sqlSpouseName,
		&app.NumChildren,
		&app.BornAgain,
		&app.WaterBaptized,
		&app.SpeakTongues,
		&sqlPrevChurch,
		&app.AttendanceCommitment,
		&app.TitheCommitment,
		&app.PrayerCommitment,
		&app.SoberCommitment,
		&app.RespectCommitment,
		&app.FaithCommitment,
		&sqlPastorDate,
		&sqlMemberDate,
		&app.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("application not found")
		}
		return nil, err
	}

	app.SpouseName = sqlSpouseName.String
	app.PrevChurch = sqlPrevChurch.String
	if sqlDOB.Valid {
		app.DateOfBirth = sqlDOB.Time
	}
	if sqlPastorDate.Valid {
		app.PastorSignatureDate = &sqlPastorDate.Time
	}
	if sqlMemberDate.Valid {
		app.MemberSignatureDate = &sqlMemberDate.Time
	}

	return &app, nil
}

func (p *PostgresDB) GetApplicationByMemberID(memberID int) (*models.Application, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
	SELECT id, member_id, date_of_birth, marital_status, spouse_name, num_children,
	born_again, water_baptized, speak_tongues, prev_church,
	attendance_commitment, tithe_commitment, prayer_commitment,
	sober_commitment, respect_commitment, faith_commitment,
	pastor_signature_date, member_signature_date, created_at
	FROM applications
	WHERE member_id = $1
	`

	var app models.Application
	
	// Handles nullable strings and dates
	var sqlSpouseName sql.NullString
	var sqlPrevChurch sql.NullString
	var sqlPastorDate sql.NullTime
	var sqlMemberDate sql.NullTime
	var sqlDOB sql.NullTime

	err := p.db.QueryRowContext(ctx, query, memberID).Scan(
		&app.ID,
		&app.MemberID,
		&sqlDOB,
		&app.MaritalStatus,
		&sqlSpouseName,
		&app.NumChildren,
		&app.BornAgain,
		&app.WaterBaptized,
		&app.SpeakTongues,
		&sqlPrevChurch,
		&app.AttendanceCommitment,
		&app.TitheCommitment,
		&app.PrayerCommitment,
		&app.SoberCommitment,
		&app.RespectCommitment,
		&app.FaithCommitment,
		&sqlPastorDate,
		&sqlMemberDate,
		&app.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("application not found")
		}
		return nil, err
	}

	app.SpouseName = sqlSpouseName.String
	app.PrevChurch = sqlPrevChurch.String
	if sqlDOB.Valid {
		app.DateOfBirth = sqlDOB.Time
	}
	if sqlPastorDate.Valid {
		app.PastorSignatureDate = &sqlPastorDate.Time
	}
	if sqlMemberDate.Valid {
		app.MemberSignatureDate = &sqlMemberDate.Time
	}

	return &app, nil
}

func (p *PostgresDB) UpdateApplication(a models.Application) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
	UPDATE applications SET
		date_of_birth = $1,
		marital_status = $2,
		spouse_name = $3,
		num_children = $4,
		born_again = $5,
		water_baptized = $6,
		speak_tongues = $7,
		prev_church = $8,
		attendance_commitment = $9,
		tithe_commitment = $10,
		prayer_commitment = $11,
		sober_commitment = $12,
		respect_commitment = $13,
		faith_commitment = $14,
		pastor_signature_date = $15,
		member_signature_date = $16
	WHERE member_id = $17
	`

	res, err := p.db.ExecContext(ctx, query,
		a.DateOfBirth,
		a.MaritalStatus,
		a.SpouseName,
		a.NumChildren,
		a.BornAgain,
		a.WaterBaptized,
		a.SpeakTongues,
		a.PrevChurch,
		a.AttendanceCommitment,
		a.TitheCommitment,
		a.PrayerCommitment,
		a.SoberCommitment,
		a.RespectCommitment,
		a.FaithCommitment,
		a.PastorSignatureDate,
		a.MemberSignatureDate,
		a.MemberID,
	)

	if err != nil {
		return err
	}
	
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	
	if rowsAffected == 0 {
		// UPSERT Fallback: If it did not exist, insert it now.
		insertQuery := `
		INSERT INTO applications (
			member_id, date_of_birth, marital_status, spouse_name, num_children,
			born_again, water_baptized, speak_tongues, prev_church,
			attendance_commitment, tithe_commitment, prayer_commitment,
			sober_commitment, respect_commitment, faith_commitment,
			pastor_signature_date, member_signature_date, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		)
		`
		_, err = p.db.ExecContext(ctx, insertQuery,
			a.MemberID, a.DateOfBirth, a.MaritalStatus, a.SpouseName, a.NumChildren,
			a.BornAgain, a.WaterBaptized, a.SpeakTongues, a.PrevChurch,
			a.AttendanceCommitment, a.TitheCommitment, a.PrayerCommitment,
			a.SoberCommitment, a.RespectCommitment, a.FaithCommitment,
			a.PastorSignatureDate, a.MemberSignatureDate, time.Now(),
		)
		if err != nil {
			return err
		}
	}

	return nil
}

