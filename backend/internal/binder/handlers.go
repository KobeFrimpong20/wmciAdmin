package binder

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler combines SQLite data access with HTTP handlers for the V1 CRUD API.
type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

// RegisterRoutes attaches the V1 member and application routes to a Gin router.
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	r.GET("/members", h.GetMembers)
	r.GET("/members/:id", h.GetMemberByID)
	r.POST("/applications", h.CreateApplication)
	r.GET("/applications", h.GetApplications)
	r.GET("/applications/:id", h.GetApplicationByID)
}

func (h *Handler) GetMembers(c *gin.Context) {
	rows, err := h.DB.QueryContext(c.Request.Context(), `
		SELECT id, first_name, last_name, email, phone, address, joined_at
		FROM members
		ORDER BY last_name, first_name
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch members"})
		return
	}
	defer rows.Close()

	members := []Member{}
	for rows.Next() {
		var m Member
		if err := rows.Scan(&m.ID, &m.FirstName, &m.LastName, &m.Email, &m.Phone, &m.Address, &m.JoinedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan member"})
			return
		}
		members = append(members, m)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read members"})
		return
	}

	c.JSON(http.StatusOK, members)
}

func (h *Handler) GetMemberByID(c *gin.Context) {
	id := c.Param("id")

	var m Member
	err := h.DB.QueryRowContext(c.Request.Context(), `
		SELECT id, first_name, last_name, email, phone, address, joined_at
		FROM members
		WHERE id = ?
	`, id).Scan(&m.ID, &m.FirstName, &m.LastName, &m.Email, &m.Phone, &m.Address, &m.JoinedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch member"})
		return
	}

	c.JSON(http.StatusOK, m)
}

func (h *Handler) CreateApplication(c *gin.Context) {
	var form IntakeForm
	if err := c.ShouldBindJSON(&form); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid application payload: " + err.Error()})
		return
	}

	form.FirstName = strings.TrimSpace(form.FirstName)
	form.LastName = strings.TrimSpace(form.LastName)
	if form.FirstName == "" || form.LastName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "First name and last name are required"})
		return
	}

	ctx := c.Request.Context()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Rollback()

	now := time.Now().UTC().Format(time.RFC3339)
	memberID := uuid.NewString()
	appID := uuid.NewString()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO members (id, first_name, last_name, email, phone, address, joined_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, memberID, form.FirstName, form.LastName, form.Email, form.Phone, form.Address, now)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create member"})
		return
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO applications (
			id, member_id,
			first_name, last_name, email, phone, address,
			date_of_birth, marital_status, spouse_name, num_children,
			born_again, water_baptized, speak_tongues, prev_church,
			attendance_commitment, tithe_commitment, prayer_commitment,
			sober_commitment, respect_commitment, faith_commitment,
			member_signature_date, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		appID, memberID,
		form.FirstName, form.LastName, form.Email, form.Phone, form.Address,
		form.DateOfBirth, form.MaritalStatus, form.SpouseName, form.NumChildren,
		boolToInt(form.BornAgain), boolToInt(form.WaterBaptized), boolToInt(form.SpeakTongues), form.PrevChurch,
		boolToInt(form.AttendanceCommitment), boolToInt(form.TitheCommitment), boolToInt(form.PrayerCommitment),
		boolToInt(form.SoberCommitment), boolToInt(form.RespectCommitment), boolToInt(form.FaithCommitment),
		form.MemberSignatureDate, now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save application"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit application"})
		return
	}

	created := Application{
		ID:                   appID,
		MemberID:             memberID,
		FirstName:            form.FirstName,
		LastName:             form.LastName,
		Email:                form.Email,
		Phone:                form.Phone,
		Address:              form.Address,
		DateOfBirth:          form.DateOfBirth,
		MaritalStatus:        form.MaritalStatus,
		SpouseName:           form.SpouseName,
		NumChildren:          form.NumChildren,
		BornAgain:            form.BornAgain,
		WaterBaptized:        form.WaterBaptized,
		SpeakTongues:         form.SpeakTongues,
		PrevChurch:           form.PrevChurch,
		AttendanceCommitment: form.AttendanceCommitment,
		TitheCommitment:      form.TitheCommitment,
		PrayerCommitment:     form.PrayerCommitment,
		SoberCommitment:      form.SoberCommitment,
		RespectCommitment:    form.RespectCommitment,
		FaithCommitment:      form.FaithCommitment,
		MemberSignatureDate:  form.MemberSignatureDate,
		CreatedAt:            now,
	}

	c.JSON(http.StatusCreated, created)
}

const selectApplicationColumns = `
	id, member_id,
	first_name, last_name, email, phone, address,
	date_of_birth, marital_status, spouse_name, num_children,
	born_again, water_baptized, speak_tongues, prev_church,
	attendance_commitment, tithe_commitment, prayer_commitment,
	sober_commitment, respect_commitment, faith_commitment,
	member_signature_date, pastor_signature_date, created_at
`

func (h *Handler) GetApplications(c *gin.Context) {
	ctx := c.Request.Context()
	memberID := strings.TrimSpace(c.Query("member_id"))

	var (
		rows *sql.Rows
		err  error
	)
	if memberID != "" {
		rows, err = h.DB.QueryContext(ctx, `
			SELECT `+selectApplicationColumns+`
			FROM applications
			WHERE member_id = ?
			ORDER BY created_at DESC
		`, memberID)
	} else {
		rows, err = h.DB.QueryContext(ctx, `
			SELECT `+selectApplicationColumns+`
			FROM applications
			ORDER BY created_at DESC
		`)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch applications"})
		return
	}
	defer rows.Close()

	apps := []Application{}
	for rows.Next() {
		app, err := scanApplication(rows)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan application"})
			return
		}
		apps = append(apps, app)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read applications"})
		return
	}

	c.JSON(http.StatusOK, apps)
}

func (h *Handler) GetApplicationByID(c *gin.Context) {
	id := c.Param("id")

	row := h.DB.QueryRowContext(c.Request.Context(), `
		SELECT `+selectApplicationColumns+`
		FROM applications
		WHERE id = ?
	`, id)

	app, err := scanApplication(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Application not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch application"})
		return
	}

	c.JSON(http.StatusOK, app)
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanApplication(s rowScanner) (Application, error) {
	var (
		a                                                                           Application
		bornAgain, waterBaptized, speakTongues                                      int
		attendance, tithe, prayer, sober, respect, faith                            int
		memberSigDate, pastorSigDate                                                sql.NullString
	)

	err := s.Scan(
		&a.ID, &a.MemberID,
		&a.FirstName, &a.LastName, &a.Email, &a.Phone, &a.Address,
		&a.DateOfBirth, &a.MaritalStatus, &a.SpouseName, &a.NumChildren,
		&bornAgain, &waterBaptized, &speakTongues, &a.PrevChurch,
		&attendance, &tithe, &prayer, &sober, &respect, &faith,
		&memberSigDate, &pastorSigDate, &a.CreatedAt,
	)
	if err != nil {
		return Application{}, err
	}

	a.BornAgain = bornAgain != 0
	a.WaterBaptized = waterBaptized != 0
	a.SpeakTongues = speakTongues != 0
	a.AttendanceCommitment = attendance != 0
	a.TitheCommitment = tithe != 0
	a.PrayerCommitment = prayer != 0
	a.SoberCommitment = sober != 0
	a.RespectCommitment = respect != 0
	a.FaithCommitment = faith != 0

	if memberSigDate.Valid {
		v := memberSigDate.String
		a.MemberSignatureDate = &v
	}
	if pastorSigDate.Valid {
		v := pastorSigDate.String
		a.PastorSignatureDate = &v
	}

	return a, nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
