package binder

import (
	"database/sql"
	"strings"
)

// TagCategory groups member tags by shared domain role and UI icon category.
type TagCategory string

const (
	TagCategoryStatus     TagCategory = "status"
	TagCategoryLeadership TagCategory = "leadership"
	TagCategoryService    TagCategory = "service"

	DefaultMemberTag = "active"
)

// TagDefinition defines a canonical member tag in the fixed tag catalog.
type TagDefinition struct {
	Name     string      `json:"name"`
	Label    string      `json:"label"`
	Category TagCategory `json:"category"`
}

// TagCatalog is the single source of truth for the fixed set of member tags.
// Note: "leadership" is a category only, not an assignable tag.
var TagCatalog = []TagDefinition{
	// Status
	{Name: "active", Label: "Active", Category: TagCategoryStatus},
	{Name: "inactive", Label: "Inactive", Category: TagCategoryStatus},
	{Name: "ex-communicated", Label: "Ex-Communicated", Category: TagCategoryStatus},
	{Name: "out of state", Label: "Out of State", Category: TagCategoryStatus},
	{Name: "out of country", Label: "Out of Country", Category: TagCategoryStatus},
	{Name: "suspended", Label: "Suspended", Category: TagCategoryStatus},
	{Name: "deceased", Label: "Deceased", Category: TagCategoryStatus},

	// Leadership
	{Name: "board", Label: "Board", Category: TagCategoryLeadership},
	{Name: "trustee", Label: "Trustee", Category: TagCategoryLeadership},
	{Name: "minister", Label: "Minister", Category: TagCategoryLeadership},
	{Name: "pastor", Label: "Pastor", Category: TagCategoryLeadership},

	// Service
	{Name: "women", Label: "Women", Category: TagCategoryService},
	{Name: "men", Label: "Men", Category: TagCategoryService},
	{Name: "media", Label: "Media", Category: TagCategoryService},
	{Name: "cleaning", Label: "Cleaning", Category: TagCategoryService},
	{Name: "usher", Label: "Usher", Category: TagCategoryService},
}

// TagMap indexes TagCatalog by canonical tag name for O(1) validation.
var TagMap = func() map[string]TagDefinition {
	m := make(map[string]TagDefinition, len(TagCatalog))
	for _, def := range TagCatalog {
		m[def.Name] = def
	}
	return m
}()

// NormalizeTagName trims whitespace, collapses internal spaces, and lowercases a tag name.
func NormalizeTagName(raw string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(raw))), " ")
}

// IsValidTag reports whether a normalized tag name exists in TagCatalog.
func IsValidTag(name string) bool {
	_, ok := TagMap[name]
	return ok
}

// seedTags inserts the fixed tag catalog into the tags table idempotently and
// backfills the default "active" tag for legacy members that have no tags yet.
func seedTags(db *sql.DB) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, def := range TagCatalog {
		if _, err := stmt.Exec(def.Name); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(`
		INSERT OR IGNORE INTO member_tags (member_id, tag_name)
		SELECT m.id, ?
		FROM members m
		WHERE NOT EXISTS (
			SELECT 1 FROM member_tags mt WHERE mt.member_id = m.id
		)
	`, DefaultMemberTag); err != nil {
		return err
	}

	return tx.Commit()
}
