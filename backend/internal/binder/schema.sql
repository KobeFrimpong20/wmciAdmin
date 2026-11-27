CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL COLLATE NOCASE CHECK(length(trim(full_name)) > 0),
    date_of_birth TEXT NOT NULL CHECK(length(trim(date_of_birth)) > 0),
    phone TEXT NOT NULL CHECK(length(trim(phone)) > 0),
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    joined_at TEXT NOT NULL,
    UNIQUE(full_name, date_of_birth, phone)
);

CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,

    -- Immutable snapshot of applicant contact info at submission time
    full_name TEXT NOT NULL CHECK(length(trim(full_name)) > 0),
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL CHECK(length(trim(phone)) > 0),
    address TEXT NOT NULL DEFAULT '',

    -- Demographics
    date_of_birth TEXT NOT NULL CHECK(length(trim(date_of_birth)) > 0),
    marital_status TEXT NOT NULL DEFAULT '',
    spouse_name TEXT NOT NULL DEFAULT '',
    num_children INTEGER NOT NULL DEFAULT 0,

    -- Spiritual history
    born_again INTEGER NOT NULL DEFAULT 0,
    water_baptized INTEGER NOT NULL DEFAULT 0,
    speak_tongues INTEGER NOT NULL DEFAULT 0,
    prev_church TEXT NOT NULL DEFAULT '',

    -- Commitments
    attendance_commitment INTEGER NOT NULL DEFAULT 0,
    tithe_commitment INTEGER NOT NULL DEFAULT 0,
    prayer_commitment INTEGER NOT NULL DEFAULT 0,
    sober_commitment INTEGER NOT NULL DEFAULT 0,
    respect_commitment INTEGER NOT NULL DEFAULT 0,
    faith_commitment INTEGER NOT NULL DEFAULT 0,

    -- Signatures & metadata
    member_signature_date TEXT,
    pastor_signature_date TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
    name TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS member_tags (
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL REFERENCES tags(name) ON DELETE CASCADE,
    PRIMARY KEY (member_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_members_full_name ON members(full_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_applications_member_id ON applications(member_id);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_tags_tag_name ON member_tags(tag_name);
