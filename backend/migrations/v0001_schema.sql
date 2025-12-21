-- 1. USERS (System Admins / Staff)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL, -- Changed from user_name, added UNIQUE
    password_hash VARCHAR(255) NOT NULL,   -- NEVER store plain text passwords
    role VARCHAR(20) DEFAULT 'staff',      -- 'admin', 'staff', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. MEMBERS (The Core Entity)
CREATE TABLE members (
    id SERIAL PRIMARY KEY, -- Standardize on 'id' vs 'member_id' for primary keys
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255), 
    phone VARCHAR(20),
    address TEXT, 
    status VARCHAR(20) DEFAULT 'active',
    joined_at DATE DEFAULT CURRENT_DATE
);

-- 3. DEPARTMENTS (Lookup Table)
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL -- e.g. 'Choir', 'Ushers', 'Kids Ministry'
);

-- 4. MEMBER_DEPARTMENTS (Junction Table for Many-to-Many)
CREATE TABLE member_departments (
    member_id INT REFERENCES members(id) ON DELETE CASCADE,
    department_id INT REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (member_id, department_id) -- Prevents duplicate assignment
);

-- 5. APPLICATIONS (1-to-1 with Members)
-- Removed Circular Dependency. Application points to Member.
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    member_id INT UNIQUE REFERENCES members(id) ON DELETE CASCADE, -- UNIQUE makes this 1-to-1
    
    -- Demographics
    date_of_birth DATE,
    marital_status VARCHAR(20), -- 'single', 'married', etc.
    spouse_name VARCHAR(100),
    num_children INT DEFAULT 0,
    
    -- Spiritual History
    born_again BOOLEAN DEFAULT FALSE,
    water_baptized BOOLEAN DEFAULT FALSE,
    speak_tongues BOOLEAN DEFAULT FALSE,
    prev_church VARCHAR(100),
    
    -- Commitments
    attendance_commitment BOOLEAN DEFAULT FALSE,
    tithe_commitment BOOLEAN DEFAULT FALSE,
    prayer_commitment BOOLEAN DEFAULT FALSE,
    sober_commitment BOOLEAN DEFAULT FALSE,
    respect_commitment BOOLEAN DEFAULT FALSE,
    faith_commitment BOOLEAN DEFAULT FALSE,
    
    -- Signatures
    pastor_signature_date DATE,
    member_signature_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TRANSACTIONS
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    member_id INT REFERENCES members(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL, -- e.g. 'Tithe', 'Offering', 'Building Fund'
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- 7. EVENTS & ATTENDANCE
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- 'Sunday Service', 'Bible Study'
    event_date DATE NOT NULL,
    category VARCHAR(50) -- 'Worship', 'Meeting', 'Social'
);

CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    member_id INT REFERENCES members(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, member_id) -- Prevents checking in twice to the same event
);

-- INDEXES
CREATE INDEX idx_members_name ON members(last_name, first_name);
CREATE INDEX idx_transactions_member ON transactions(member_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);