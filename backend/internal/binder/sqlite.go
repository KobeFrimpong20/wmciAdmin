package binder

import (
	"database/sql"
	_ "embed"
	"fmt"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

//go:embed schema.sql
var schemaSQL string

// sqliteDSN ensures every pooled connection opened by go-sqlite3 enables
// foreign key enforcement and a busy timeout automatically.
func sqliteDSN(dbPath string) string {
	sep := "?"
	if strings.Contains(dbPath, "?") {
		sep = "&"
	}
	return dbPath + sep + "_foreign_keys=on&_busy_timeout=5000"
}

// OpenDB opens a SQLite database at the given path (or ":memory:"),
// configures pragmas, and applies the embedded schema.
func OpenDB(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", sqliteDSN(dbPath))
	if err != nil {
		return nil, fmt.Errorf("open sqlite db: %w", err)
	}

	if dbPath == ":memory:" {
		db.SetMaxOpenConns(1)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping sqlite db: %w", err)
	}

	pragmas := []string{
		"PRAGMA foreign_keys = ON;",
		"PRAGMA journal_mode = WAL;",
		"PRAGMA busy_timeout = 5000;",
	}
	for _, pragma := range pragmas {
		if _, err := db.Exec(pragma); err != nil {
			db.Close()
			return nil, fmt.Errorf("apply pragma %q: %w", pragma, err)
		}
	}

	if _, err := db.Exec(schemaSQL); err != nil {
		db.Close()
		return nil, fmt.Errorf("init schema: %w", err)
	}

	if err := migrateMembersStatus(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("migrate members membership_status: %w", err)
	}

	if err := seedTags(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("seed tags: %w", err)
	}

	return db, nil
}

// migrateMembersStatus ensures existing SQLite databases created before membership_status
// existed receive the column (backfilled to 'accepted' for existing congregation members)
// and creates the membership_status index.
func migrateMembersStatus(db *sql.DB) error {
	rows, err := db.Query(`PRAGMA table_info(members)`)
	if err != nil {
		return err
	}
	defer rows.Close()

	hasStatusColumn := false
	for rows.Next() {
		var (
			cid       int
			name      string
			colType   string
			notNull   int
			dfltValue sql.NullString
			pk        int
		)
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dfltValue, &pk); err != nil {
			return err
		}
		if name == "membership_status" {
			hasStatusColumn = true
			break
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if err := rows.Close(); err != nil {
		return err
	}

	if !hasStatusColumn {
		if _, err := db.Exec(`
			ALTER TABLE members
			ADD COLUMN membership_status TEXT NOT NULL DEFAULT 'accepted'
			CHECK(membership_status IN ('pending', 'accepted'))
		`); err != nil {
			return err
		}
	}

	if _, err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_members_membership_status ON members(membership_status)
	`); err != nil {
		return err
	}

	return nil
}
