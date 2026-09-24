const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_FILE = path.join(DATA_DIR, 'database.sqlite');

const db = new Database(DB_FILE);

if (process.platform === 'win32') {
    try { db.pragma('journal_mode = WAL'); } catch (e) {}
} else {
    try { db.pragma('journal_mode = DELETE'); } catch (e) {}
}

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
        instructor TEXT,
        instructor_email TEXT,
        theme TEXT
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

    CREATE TABLE IF NOT EXISTS grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id TEXT,
        student_id TEXT,
        grade TEXT,
        feedback TEXT,
        graded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(assignment_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS otp_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        user_data TEXT,
        expires_at BIGINT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'Admin',
        lastLogin TEXT,
        status TEXT DEFAULT 'Active',
        avatar TEXT
    );

    INSERT OR IGNORE INTO admin_users (name, email, password, role, status)
    VALUES ('System Admin', 'admin@verity.com', 'admin', 'Admin', 'Active');

    INSERT OR IGNORE INTO admin_users (name, email, password, role, lastLogin, status, avatar)
    SELECT name, email, password, role, lastLogin, status, avatar FROM users WHERE LOWER(role) = 'admin';

    DELETE FROM users WHERE LOWER(role) = 'admin';
`);

try { db.exec(`ALTER TABLE classrooms ADD COLUMN instructor_email TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE classrooms ADD COLUMN theme TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT;`); } catch (e) {}

function generateClassCodeSync(takenSet = new Set()) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    let attempts = 0;
    while (attempts < 1000) {
        code = '';
        for (let i = 0; i < 7; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (!takenSet.has(code)) {
            takenSet.add(code);
            return code;
        }
        attempts++;
    }
    const fallback = ('v' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5)).slice(0, 7);
    takenSet.add(fallback);
    return fallback;
}

try {
    const rows = db.prepare('SELECT id, code FROM classrooms').all();
    const taken = new Set();
    const duplicatesOrEmpty = [];
    for (const r of rows) {
        const c = (r.code || '').trim().toLowerCase();
        if (!c || taken.has(c)) {
            duplicatesOrEmpty.push(r);
        } else {
            taken.add(c);
        }
    }
    const updateStmt = db.prepare('UPDATE classrooms SET code = ? WHERE id = ?');
    for (const r of duplicatesOrEmpty) {
        const newCode = generateClassCodeSync(taken);
        updateStmt.run(newCode, r.id);
    }
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_classrooms_unique_code ON classrooms(code);`);
} catch (e) {
    console.warn('[database.js] Classroom code migration notice:', e.message);
}

module.exports = db;
