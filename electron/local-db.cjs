const path = require('path');
const fs = require('fs');

let db = null;
let useJsonFallback = false;
let fallbackFile = null;
let fallbackData = {
    drafts: {},
    cached_classrooms: [],
    cached_classwork: {},
    sync_queue: [],
    key_value: {}
};

function initLocalDb(userDataPath) {
    const dataDir = userDataPath || path.join(__dirname, '..');
    const dbFile = path.join(dataDir, 'local-cache.sqlite');
    fallbackFile = path.join(dataDir, 'local-cache.json');

    try {
        let Database;
        try {
            Database = require('better-sqlite3');
        } catch (_) {
            Database = require('../server/node_modules/better-sqlite3');
        }

        db = new Database(dbFile);
        db.pragma('journal_mode = WAL');

        // Create local storage tables
        db.exec(`
            CREATE TABLE IF NOT EXISTS drafts (
                assignment_id TEXT NOT NULL,
                student_id TEXT NOT NULL,
                code TEXT NOT NULL,
                history TEXT,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (assignment_id, student_id)
            );

            CREATE TABLE IF NOT EXISTS cached_classrooms (
                id TEXT PRIMARY KEY,
                name TEXT,
                data TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS cached_classwork (
                classroom_id TEXT PRIMARY KEY,
                data TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                url TEXT NOT NULL,
                method TEXT NOT NULL,
                body TEXT,
                created_at TEXT NOT NULL,
                status TEXT DEFAULT 'pending'
            );

            CREATE TABLE IF NOT EXISTS local_key_value (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);

        console.log(`[LocalDB] SQLite local client storage initialized: ${dbFile}`);
        return { type: 'sqlite', path: dbFile };
    } catch (err) {
        console.warn(`[LocalDB] Could not open SQLite directly in Electron (${err.message}). Using JSON fallback store.`);
        useJsonFallback = true;
        if (fs.existsSync(fallbackFile)) {
            try {
                fallbackData = JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
            } catch (_) {
                fallbackData = { drafts: {}, cached_classrooms: [], cached_classwork: {}, sync_queue: [], key_value: {} };
            }
        }
        return { type: 'json-fallback', path: fallbackFile };
    }
}

function saveFallback() {
    if (!fallbackFile) return;
    try {
        fs.writeFileSync(fallbackFile, JSON.stringify(fallbackData, null, 2), 'utf8');
    } catch (e) {
        console.error('[LocalDB] Failed to save fallback data:', e);
    }
}

// API methods exposed over IPC
const localDbAPI = {
    // Save draft code for assignment
    saveDraft(assignmentId, studentId, code, history = []) {
        const updated_at = new Date().toISOString();
        const histStr = typeof history === 'string' ? history : JSON.stringify(history);
        if (db && !useJsonFallback) {
            const stmt = db.prepare(`
                INSERT INTO drafts (assignment_id, student_id, code, history, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(assignment_id, student_id) DO UPDATE SET
                    code = excluded.code,
                    history = excluded.history,
                    updated_at = excluded.updated_at
            `);
            stmt.run(String(assignmentId), String(studentId), code, histStr, updated_at);
            return { success: true, updated_at };
        } else {
            const key = `${assignmentId}:${studentId}`;
            fallbackData.drafts[key] = { assignmentId, studentId, code, history, updated_at };
            saveFallback();
            return { success: true, updated_at };
        }
    },

    // Get draft code
    getDraft(assignmentId, studentId) {
        if (db && !useJsonFallback) {
            const row = db.prepare('SELECT * FROM drafts WHERE assignment_id = ? AND student_id = ?')
                .get(String(assignmentId), String(studentId));
            if (!row) return null;
            let hist = [];
            try { hist = JSON.parse(row.history || '[]'); } catch (_) {}
            return { ...row, history: hist };
        } else {
            const key = `${assignmentId}:${studentId}`;
            return fallbackData.drafts[key] || null;
        }
    },

    // Cache classrooms for offline viewing
    cacheClassrooms(classrooms) {
        if (!Array.isArray(classrooms)) return { success: false };
        const now = new Date().toISOString();
        if (db && !useJsonFallback) {
            const deleteStmt = db.prepare('DELETE FROM cached_classrooms');
            const insertStmt = db.prepare('INSERT INTO cached_classrooms (id, name, data, updated_at) VALUES (?, ?, ?, ?)');
            db.transaction(() => {
                deleteStmt.run();
                classrooms.forEach(c => {
                    insertStmt.run(String(c.id), c.name || '', JSON.stringify(c), now);
                });
            })();
            return { success: true, count: classrooms.length };
        } else {
            fallbackData.cached_classrooms = classrooms;
            saveFallback();
            return { success: true, count: classrooms.length };
        }
    },

    // Get cached classrooms
    getCachedClassrooms() {
        if (db && !useJsonFallback) {
            const rows = db.prepare('SELECT * FROM cached_classrooms').all();
            return rows.map(r => {
                try { return JSON.parse(r.data); } catch (_) { return r; }
            });
        } else {
            return fallbackData.cached_classrooms || [];
        }
    },

    // Cache classwork items for a classroom
    cacheClasswork(classroomId, classwork) {
        if (!Array.isArray(classwork)) return { success: false };
        const now = new Date().toISOString();
        if (db && !useJsonFallback) {
            const stmt = db.prepare(`
                INSERT INTO cached_classwork (classroom_id, data, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(classroom_id) DO UPDATE SET
                    data = excluded.data,
                    updated_at = excluded.updated_at
            `);
            stmt.run(String(classroomId), JSON.stringify(classwork), now);
            return { success: true };
        } else {
            fallbackData.cached_classwork[String(classroomId)] = classwork;
            saveFallback();
            return { success: true };
        }
    },

    // Get cached classwork for a classroom
    getCachedClasswork(classroomId) {
        if (db && !useJsonFallback) {
            const row = db.prepare('SELECT * FROM cached_classwork WHERE classroom_id = ?').get(String(classroomId));
            if (!row) return [];
            try { return JSON.parse(row.data || '[]'); } catch (_) { return []; }
        } else {
            return fallbackData.cached_classwork[String(classroomId)] || [];
        }
    },

    // Add mutation to offline sync queue
    addToSyncQueue(action, url, method, body) {
        const now = new Date().toISOString();
        const bodyStr = typeof body === 'object' ? JSON.stringify(body) : String(body || '');
        if (db && !useJsonFallback) {
            const stmt = db.prepare(`
                INSERT INTO sync_queue (action, url, method, body, created_at, status)
                VALUES (?, ?, ?, ?, ?, 'pending')
            `);
            const info = stmt.run(action, url, method, bodyStr, now);
            return { id: info.lastInsertRowid, status: 'pending' };
        } else {
            const id = Date.now();
            const item = { id, action, url, method, body: bodyStr, created_at: now, status: 'pending' };
            fallbackData.sync_queue.push(item);
            saveFallback();
            return item;
        }
    },

    // Get pending items in sync queue
    getSyncQueue() {
        if (db && !useJsonFallback) {
            const rows = db.prepare("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY id ASC").all();
            return rows.map(r => {
                let parsed = r.body;
                try { parsed = JSON.parse(r.body); } catch (_) {}
                return { ...r, body: parsed };
            });
        } else {
            return (fallbackData.sync_queue || []).filter(q => q.status === 'pending');
        }
    },

    // Remove item from sync queue
    removeFromSyncQueue(id) {
        if (db && !useJsonFallback) {
            db.prepare('DELETE FROM sync_queue WHERE id = ?').run(id);
            return { success: true };
        } else {
            fallbackData.sync_queue = (fallbackData.sync_queue || []).filter(q => q.id !== id);
            saveFallback();
            return { success: true };
        }
    },

    // Set local key-value setting
    setLocal(key, value) {
        const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (db && !useJsonFallback) {
            db.prepare(`
                INSERT INTO local_key_value (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `).run(String(key), valStr);
            return { success: true };
        } else {
            fallbackData.key_value[key] = value;
            saveFallback();
            return { success: true };
        }
    },

    // Get local key-value setting
    getLocal(key) {
        if (db && !useJsonFallback) {
            const row = db.prepare('SELECT value FROM local_key_value WHERE key = ?').get(String(key));
            if (!row) return null;
            try { return JSON.parse(row.value); } catch (_) { return row.value; }
        } else {
            return fallbackData.key_value[key] ?? null;
        }
    }
};

module.exports = {
    initLocalDb,
    localDbAPI
};
