const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_FILE = path.join(DATA_DIR, 'database.sqlite');

const db = new Database(DB_FILE);

db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        lastLogin TEXT,
        status TEXT
    );

    CREATE TABLE IF NOT EXISTS classrooms (
        id INTEGER PRIMARY KEY,
        code TEXT,
        section TEXT,
        name TEXT,
        subject TEXT,
        instructor TEXT
    );

    CREATE TABLE IF NOT EXISTS classwork (
        id INTEGER PRIMARY KEY,
        classroom_id INTEGER,
        title TEXT,
        description TEXT,
        dueDate TEXT,
        type TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER,
        student_name TEXT,
        history TEXT,
        submittedAt TEXT,
        FOREIGN KEY (assignment_id) REFERENCES classwork(id)
    );

    CREATE TABLE IF NOT EXISTS security_flags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date_string TEXT UNIQUE,
        count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        user TEXT,
        type TEXT,
        severity TEXT DEFAULT 'Normal',
        desc TEXT
    );

    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS access_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE,
        student_name TEXT,
        classroom TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS question_bank (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        starter_code TEXT,
        test_cases TEXT,
        points INTEGER DEFAULT 100,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

module.exports = db;
