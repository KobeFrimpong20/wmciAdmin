package binder

// Member represents a church member record.
type Member struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Address   string `json:"address"`
	JoinedAt  string `json:"joined_at"`
}

// Application represents an immutable intake snapshot linked to a member.
type Application struct {
	ID       string `json:"id"`
	MemberID string `json:"member_id"`

	// Contact snapshot
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Address   string `json:"address"`

	// Demographics
	DateOfBirth   string `json:"date_of_birth"`
	MaritalStatus string `json:"marital_status"`
	SpouseName    string `json:"spouse_name"`
	NumChildren   int    `json:"num_children"`

	// Spiritual history
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

	// Signatures & metadata
	MemberSignatureDate *string `json:"member_signature_date"`
	PastorSignatureDate *string `json:"pastor_signature_date"`
	CreatedAt           string  `json:"created_at"`
}

// IntakeForm is the JSON payload submitted to POST /applications.
type IntakeForm struct {
	// Personal info
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Address   string `json:"address"`

	// Demographics
	DateOfBirth   string `json:"date_of_birth"`
	MaritalStatus string `json:"marital_status"`
	SpouseName    string `json:"spouse_name"`
	NumChildren   int    `json:"num_children"`

	// Spiritual history
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

	// Signature
	MemberSignatureDate *string `json:"member_signature_date"`
}
