CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    joined_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,

    -- Immutable snapshot of applicant contact info at submission time
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',

    -- Demographics
    date_of_birth TEXT NOT NULL DEFAULT '',
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

CREATE INDEX IF NOT EXISTS idx_members_name ON members(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_applications_member_id ON applications(member_id);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
