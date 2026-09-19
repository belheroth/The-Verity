-- PostgreSQL / Supabase Schema for The Verity

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    lastlogin TEXT,
    status VARCHAR(50) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS classrooms (
    id BIGINT PRIMARY KEY,
    code VARCHAR(100),
    section VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    instructor VARCHAR(255)
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
    count INTEGER DEFAULT 0
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
