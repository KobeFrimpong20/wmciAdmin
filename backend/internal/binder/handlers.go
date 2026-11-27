package binder

import (
	"context"
	"database/sql"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler combines SQLite data access with HTTP handlers for the V1 CRUD API.
type Handler struct {
	DB   *sql.DB
	Auth AuthConfig
}

func NewHandler(db *sql.DB, auth AuthConfig) *Handler {
	return &Handler{DB: db, Auth: auth}
}

// RegisterRoutes attaches the public intake/auth routes and admin-protected routes to a Gin router.
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	// Public routes: admin sign-in and public idempotent membership intake
	r.POST("/login", h.Login)
	r.POST("/applications", h.CreateApplication)

	// Admin-only routes protected by JWT role-based access control
	admin := r.Group("")
	admin.Use(h.RequireRole(RoleAdmin))
	{
		admin.GET("/auth/me", h.GetCurrentSession)
		admin.GET("/members", h.GetMembers)
		admin.GET("/members/:id", h.GetMemberByID)
		admin.PATCH("/members/:id/tags", h.PatchMemberTags)
		admin.GET("/applications", h.GetApplications)
		admin.GET("/applications/:id", h.GetApplicationByID)
		admin.POST("/applications/:id/accept", h.AcceptApplication)
		admin.DELETE("/applications/:id", h.RejectApplication)
	}
}

func (h *Handler) GetMembers(c *gin.Context) {
	ctx := c.Request.Context()
	rows, err := h.DB.QueryContext(ctx, `
		SELECT id, full_name, date_of_birth, phone, email, address, joined_at, membership_status
		FROM members
		WHERE membership_status = ?
		ORDER BY full_name COLLATE NOCASE
	`, MembershipStatusAccepted)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch members"})
		return
	}
	defer rows.Close()

	members := []Member{}
	memberIndex := make(map[string]int)
	for rows.Next() {
		var m Member
		if err := rows.Scan(&m.ID, &m.FullName, &m.DateOfBirth, &m.Phone, &m.Email, &m.Address, &m.JoinedAt, &m.MembershipStatus); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan member"})
			return
		}
		m.Tags = []string{}
		memberIndex[m.ID] = len(members)
		members = append(members, m)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read members"})
		return
	}

	if len(members) > 0 {
		tagRows, err := h.DB.QueryContext(ctx, `
			SELECT member_id, tag_name
			FROM member_tags
			ORDER BY tag_name ASC
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch member tags"})
			return
		}
		defer tagRows.Close()

		for tagRows.Next() {
			var memberID, tagName string
			if err := tagRows.Scan(&memberID, &tagName); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan member tag"})
				return
			}
			if idx, ok := memberIndex[memberID]; ok {
				members[idx].Tags = append(members[idx].Tags, tagName)
			}
		}
		if err := tagRows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read member tags"})
			return
		}
	}

	c.JSON(http.StatusOK, members)
}

func (h *Handler) GetMemberByID(c *gin.Context) {
	ctx := c.Request.Context()
	id := c.Param("id")

	var m Member
	err := h.DB.QueryRowContext(ctx, `
		SELECT id, full_name, date_of_birth, phone, email, address, joined_at, membership_status
		FROM members
		WHERE id = ?
	`, id).Scan(&m.ID, &m.FullName, &m.DateOfBirth, &m.Phone, &m.Email, &m.Address, &m.JoinedAt, &m.MembershipStatus)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch member"})
		return
	}

	tags, err := fetchMemberTags(ctx, h.DB, m.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch member tags"})
		return
	}
	m.Tags = tags

	c.JSON(http.StatusOK, m)
}

func (h *Handler) PatchMemberTags(c *gin.Context) {
	id := c.Param("id")

	var req PatchMemberTagsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tag update payload: " + err.Error()})
		return
	}

	addTags, invalidAdd := normalizeAndValidateTagList(req.Add)
	if invalidAdd != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tag: " + invalidAdd})
		return
	}

	removeTags, invalidRemove := normalizeAndValidateTagList(req.Remove)
	if invalidRemove != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tag: " + invalidRemove})
		return
	}

	if len(addTags) == 0 && len(removeTags) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one tag to add or remove is required"})
		return
	}

	addSet := make(map[string]struct{}, len(addTags))
	for _, tag := range addTags {
		addSet[tag] = struct{}{}
	}
	for _, tag := range removeTags {
		if _, conflict := addSet[tag]; conflict {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot both add and remove tag: " + tag})
			return
		}
	}

	ctx := c.Request.Context()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Rollback()

	var m Member
	err = tx.QueryRowContext(ctx, `
		SELECT id, full_name, date_of_birth, phone, email, address, joined_at, membership_status
		FROM members
		WHERE id = ?
	`, id).Scan(&m.ID, &m.FullName, &m.DateOfBirth, &m.Phone, &m.Email, &m.Address, &m.JoinedAt, &m.MembershipStatus)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch member"})
		return
	}

	if m.MembershipStatus != MembershipStatusAccepted {
		c.JSON(http.StatusConflict, gin.H{"error": "Pending members must be accepted before editing tags"})
		return
	}

	for _, tag := range addTags {
		if _, err := tx.ExecContext(ctx, `
			INSERT OR IGNORE INTO member_tags (member_id, tag_name)
			VALUES (?, ?)
		`, m.ID, tag); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add member tag"})
			return
		}
	}

	for _, tag := range removeTags {
		if _, err := tx.ExecContext(ctx, `
			DELETE FROM member_tags
			WHERE member_id = ? AND tag_name = ?
		`, m.ID, tag); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove member tag"})
			return
		}
	}

	tags, err := fetchMemberTags(ctx, tx, m.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read updated member tags"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit member tags"})
		return
	}

	m.Tags = tags
	c.JSON(http.StatusOK, m)
}

type queryRunner interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}

func fetchMemberTags(ctx context.Context, q queryRunner, memberID string) ([]string, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT tag_name
		FROM member_tags
		WHERE member_id = ?
		ORDER BY tag_name ASC
	`, memberID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tags := []string{}
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return tags, nil
}

func normalizeAndValidateTagList(rawTags []string) ([]string, string) {
	normalized := make([]string, 0, len(rawTags))
	seen := make(map[string]struct{}, len(rawTags))

	for _, raw := range rawTags {
		tag := NormalizeTagName(raw)
		if tag == "" || !IsValidTag(tag) {
			return nil, strings.TrimSpace(raw)
		}
		if _, exists := seen[tag]; exists {
			continue
		}
		seen[tag] = struct{}{}
		normalized = append(normalized, tag)
	}

	return normalized, ""
}

func (h *Handler) CreateApplication(c *gin.Context) {
	var form IntakeForm
	if err := c.ShouldBindJSON(&form); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid application payload: " + err.Error()})
		return
	}

	form.ID = strings.TrimSpace(form.ID)
	if form.ID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Application id is required"})
		return
	}
	if err := uuid.Validate(form.ID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid application id: must be a valid UUID"})
		return
	}
	appID := form.ID

	firstName := normalizeNamePart(form.FirstName)
	lastName := normalizeNamePart(form.LastName)
	if firstName == "" || lastName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "First name and last name are required"})
		return
	}
	fullName := lastName + ", " + firstName

	dob, err := normalizeDateOfBirth(form.DateOfBirth)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Date of birth must be a valid date in YYYY-MM-DD format"})
		return
	}

	phone := normalizePhone(form.Phone)
	if phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number is required and must contain digits"})
		return
	}

	if !form.AttendanceCommitment ||
		!form.TitheCommitment ||
		!form.PrayerCommitment ||
		!form.SoberCommitment ||
		!form.RespectCommitment ||
		!form.FaithCommitment {
		c.JSON(http.StatusBadRequest, gin.H{"error": "All membership commitments must be agreed to before submitting"})
		return
	}

	email := strings.TrimSpace(form.Email)
	address := strings.TrimSpace(form.Address)

	ctx := c.Request.Context()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Rollback()

	var existingID string
	err = tx.QueryRowContext(ctx, `SELECT id FROM applications WHERE id = ?`, appID).Scan(&existingID)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Application with this id has already been submitted"})
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing application"})
		return
	}

	err = tx.QueryRowContext(ctx, `
		SELECT id FROM members
		WHERE full_name = ? COLLATE NOCASE AND date_of_birth = ? AND phone = ?
	`, fullName, dob, phone).Scan(&existingID)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "A member with this full name, date of birth, and phone number already exists"})
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing member"})
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)
	memberID := uuid.NewString()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO members (id, full_name, date_of_birth, phone, email, address, joined_at, membership_status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, memberID, fullName, dob, phone, email, address, now, MembershipStatusPending)
	if err != nil {
		_ = tx.Rollback()
		if lookupErr := h.DB.QueryRowContext(ctx, `
			SELECT id FROM members
			WHERE full_name = ? COLLATE NOCASE AND date_of_birth = ? AND phone = ?
		`, fullName, dob, phone).Scan(&existingID); lookupErr == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "A member with this full name, date of birth, and phone number already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create member"})
		return
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO applications (
			id, member_id,
			full_name, email, phone, address,
			date_of_birth, marital_status, spouse_name, num_children,
			born_again, water_baptized, speak_tongues, prev_church,
			attendance_commitment, tithe_commitment, prayer_commitment,
			sober_commitment, respect_commitment, faith_commitment,
			member_signature_date, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		appID, memberID,
		fullName, email, phone, address,
		dob, form.MaritalStatus, form.SpouseName, form.NumChildren,
		boolToInt(form.BornAgain), boolToInt(form.WaterBaptized), boolToInt(form.SpeakTongues), form.PrevChurch,
		boolToInt(form.AttendanceCommitment), boolToInt(form.TitheCommitment), boolToInt(form.PrayerCommitment),
		boolToInt(form.SoberCommitment), boolToInt(form.RespectCommitment), boolToInt(form.FaithCommitment),
		form.MemberSignatureDate, now,
	)
	if err != nil {
		_ = tx.Rollback()
		if lookupErr := h.DB.QueryRowContext(ctx, `SELECT id FROM applications WHERE id = ?`, appID).Scan(&existingID); lookupErr == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Application with this id has already been submitted"})
			return
		}
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
		FullName:             fullName,
		Email:                email,
		Phone:                phone,
		Address:              address,
		DateOfBirth:          dob,
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
	full_name, email, phone, address,
	date_of_birth, marital_status, spouse_name, num_children,
	born_again, water_baptized, speak_tongues, prev_church,
	attendance_commitment, tithe_commitment, prayer_commitment,
	sober_commitment, respect_commitment, faith_commitment,
	member_signature_date, pastor_signature_date, created_at
`

const selectPrefixedApplicationColumns = `
	a.id, a.member_id,
	a.full_name, a.email, a.phone, a.address,
	a.date_of_birth, a.marital_status, a.spouse_name, a.num_children,
	a.born_again, a.water_baptized, a.speak_tongues, a.prev_church,
	a.attendance_commitment, a.tithe_commitment, a.prayer_commitment,
	a.sober_commitment, a.respect_commitment, a.faith_commitment,
	a.member_signature_date, a.pastor_signature_date, a.created_at
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
			SELECT `+selectPrefixedApplicationColumns+`
			FROM applications a
			INNER JOIN members m ON m.id = a.member_id
			WHERE m.membership_status = ?
			ORDER BY a.created_at DESC
		`, MembershipStatusPending)
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

func (h *Handler) AcceptApplication(c *gin.Context) {
	id := c.Param("id")

	var req AcceptApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil && !errors.Is(err, io.EOF) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid accept payload: " + err.Error()})
		return
	}

	nowUTC := time.Now().UTC()
	sigDate := nowUTC.Format("2006-01-02")
	if req.PastorSignatureDate != nil && strings.TrimSpace(*req.PastorSignatureDate) != "" {
		parsed, err := normalizeDateOfBirth(*req.PastorSignatureDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Pastor signature date must be a valid date in YYYY-MM-DD format"})
			return
		}
		sigDate = parsed
	}

	ctx := c.Request.Context()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Rollback()

	app, err := scanApplication(tx.QueryRowContext(ctx, `
		SELECT `+selectApplicationColumns+`
		FROM applications
		WHERE id = ?
	`, id))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Application not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch application"})
		return
	}

	var m Member
	err = tx.QueryRowContext(ctx, `
		SELECT id, full_name, date_of_birth, phone, email, address, joined_at, membership_status
		FROM members
		WHERE id = ?
	`, app.MemberID).Scan(&m.ID, &m.FullName, &m.DateOfBirth, &m.Phone, &m.Email, &m.Address, &m.JoinedAt, &m.MembershipStatus)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch linked member"})
		return
	}

	if m.MembershipStatus == MembershipStatusAccepted {
		c.JSON(http.StatusConflict, gin.H{"error": "Application has already been accepted"})
		return
	}

	joinedAt := nowUTC.Format(time.RFC3339)
	if _, err := tx.ExecContext(ctx, `
		UPDATE members
		SET membership_status = ?, joined_at = ?
		WHERE id = ?
	`, MembershipStatusAccepted, joinedAt, m.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept member"})
		return
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE applications
		SET pastor_signature_date = ?
		WHERE id = ?
	`, sigDate, app.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record pastor signature date"})
		return
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT OR IGNORE INTO member_tags (member_id, tag_name)
		VALUES (?, ?)
	`, m.ID, DefaultMemberTag); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign default active tag"})
		return
	}

	tags, err := fetchMemberTags(ctx, tx, m.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read member tags"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit application acceptance"})
		return
	}

	app.PastorSignatureDate = &sigDate
	m.MembershipStatus = MembershipStatusAccepted
	m.JoinedAt = joinedAt
	m.Tags = tags

	c.JSON(http.StatusOK, AcceptApplicationResponse{
		Application: app,
		Member:      m,
	})
}

func (h *Handler) RejectApplication(c *gin.Context) {
	id := c.Param("id")
	ctx := c.Request.Context()

	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Rollback()

	var memberID, status string
	err = tx.QueryRowContext(ctx, `
		SELECT a.member_id, m.membership_status
		FROM applications a
		INNER JOIN members m ON m.id = a.member_id
		WHERE a.id = ?
	`, id).Scan(&memberID, &status)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Application not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch application"})
		return
	}

	if status != MembershipStatusPending {
		c.JSON(http.StatusConflict, gin.H{"error": "Cannot reject an already accepted member"})
		return
	}

	// Deleting the member row cascades to applications and member_tags via ON DELETE CASCADE.
	if _, err := tx.ExecContext(ctx, `DELETE FROM members WHERE id = ?`, memberID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject application"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit application rejection"})
		return
	}

	c.Status(http.StatusNoContent)
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanApplication(s rowScanner) (Application, error) {
	var (
		a                                                Application
		bornAgain, waterBaptized, speakTongues           int
		attendance, tithe, prayer, sober, respect, faith int
		memberSigDate, pastorSigDate                     sql.NullString
	)

	err := s.Scan(
		&a.ID, &a.MemberID,
		&a.FullName, &a.Email, &a.Phone, &a.Address,
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

// normalizeNamePart trims surrounding whitespace, collapses internal whitespace,
// lowercases all characters, and capitalizes the first letter of each part.
func normalizeNamePart(s string) string {
	words := strings.Fields(strings.ToLower(strings.TrimSpace(s)))
	for i, w := range words {
		words[i] = properCaseToken(w)
	}
	return strings.Join(words, " ")
}

func properCaseToken(token string) string {
	var b strings.Builder
	b.Grow(len(token))
	capNext := true
	for _, r := range token {
		if r == '-' || r == '\'' {
			b.WriteRune(r)
			capNext = true
			continue
		}
		if capNext {
			b.WriteRune(unicode.ToUpper(r))
			capNext = false
		} else {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// normalizePhone strips all non-digit characters.
func normalizePhone(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// normalizeDateOfBirth validates strict YYYY-MM-DD calendar format.
func normalizeDateOfBirth(s string) (string, error) {
	trimmed := strings.TrimSpace(s)
	if len(trimmed) != 10 {
		return "", errors.New("invalid date length")
	}
	parsed, err := time.Parse("2006-01-02", trimmed)
	if err != nil {
		return "", err
	}
	return parsed.Format("2006-01-02"), nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
