-- PostgreSQL / Supabase Schema for The Verity

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    lastlogin TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    avatar TEXT
);

CREATE TABLE IF NOT EXISTS classrooms (
    id BIGINT PRIMARY KEY,
    code VARCHAR(100),
    section VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    instructor VARCHAR(255),
    instructor_email VARCHAR(255),
    theme TEXT
);

CREATE TABLE IF NOT EXISTS enrollments (
    id BIGSERIAL PRIMARY KEY,
    classroom_id BIGINT,
    student_id BIGINT,
    student_name VARCHAR(255),
    student_email VARCHAR(255),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(classroom_id, student_email)
);

CREATE TABLE IF NOT EXISTS classwork (
    id BIGINT PRIMARY KEY,
    classroom_id BIGINT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duedate TEXT,
    type VARCHAR(50) DEFAULT 'Assignment',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT,
    student_name VARCHAR(255) NOT NULL,
    history TEXT,
    submittedat TEXT
);

CREATE TABLE IF NOT EXISTS security_flags (
    id BIGSERIAL PRIMARY KEY,
    date_string VARCHAR(50) UNIQUE,
    count INTEGER DEFAULT 0,
    alt_tab_copy_paste_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "user" VARCHAR(255),
    type VARCHAR(100),
    severity VARCHAR(50) DEFAULT 'Normal',
    "desc" TEXT
);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS access_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    student_name VARCHAR(255),
    classroom VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_bank (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    starter_code TEXT,
    test_cases TEXT,
    points INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grades (
    id BIGSERIAL PRIMARY KEY,
    assignment_id VARCHAR(100),
    student_id VARCHAR(100),
    grade VARCHAR(50),
    feedback TEXT,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_classwork_classroom ON classwork(classroom_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_name);
CREATE INDEX IF NOT EXISTS idx_grades_assignment_student ON grades(assignment_id, student_id);

CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'Admin',
    lastlogin TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    avatar TEXT
);

-- Default Admin Account in isolated admin_users table
INSERT INTO admin_users (name, email, password, role, status)
VALUES ('System Admin', 'admin@verity.com', 'admin', 'Admin', 'Active')
ON CONFLICT (email) DO NOTHING;

-- Ensure admin accounts do not exist in users table
DELETE FROM users WHERE role = 'Admin';

