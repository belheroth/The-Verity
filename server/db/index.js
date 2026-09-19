const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let provider = 'sqlite';
let pgPool = null;
let sqliteDb = null;

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.POSTGRES_URL;

// Helper to convert '?' placeholders to PostgreSQL '$1, $2, ...' placeholders
function convertPlaceholders(sql) {
    let index = 1;
    // Replace ? with $1, $2, etc.
    let converted = sql.replace(/\?/g, () => `$${index++}`);
    // Replace reserved words as column identifiers in audit_logs
    converted = converted.replace(/\baudit_logs\s*\(\s*timestamp,\s*user,/i, 'audit_logs (timestamp, "user",');
    converted = converted.replace(/,\s*severity,\s*desc\s*\)/i, ', severity, "desc")');
    return converted;
}

function normalizeParams(args) {
    if (args.length === 0) return [];
    if (args.length === 1 && Array.isArray(args[0])) return args[0];
    return args;
}

function normalizeRow(row) {
    if (!row || typeof row !== 'object') return row;
    // Normalize casing between Postgres (lowercased) and SQLite (camelCased)
    if (row.lastlogin !== undefined && row.lastLogin === undefined) row.lastLogin = row.lastlogin;
    if (row.duedate !== undefined && row.dueDate === undefined) row.dueDate = row.duedate;
    if (row.submittedat !== undefined && row.submittedAt === undefined) row.submittedAt = row.submittedat;
    if (row.c !== undefined && !isNaN(Number(row.c))) row.c = Number(row.c);
    if (row.id !== undefined && !isNaN(Number(row.id))) row.id = Number(row.id);
    if (row.classroom_id !== undefined && !isNaN(Number(row.classroom_id))) row.classroom_id = Number(row.classroom_id);
    if (row.assignment_id !== undefined && !isNaN(Number(row.assignment_id))) row.assignment_id = Number(row.assignment_id);
    return row;
}

function initSqlite() {
    if (sqliteDb) return;
    try {
        const Database = require('better-sqlite3');
        const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');
        const DB_FILE = path.join(DATA_DIR, 'database.sqlite');
        sqliteDb = new Database(DB_FILE);
        
        // WAL mode uses POSIX shared memory (mmap) which segfaults (exit 139) in Docker overlayfs
        if (process.platform === 'win32') {
            try { sqliteDb.pragma('journal_mode = WAL'); } catch (e) {}
        } else {
            try { sqliteDb.pragma('journal_mode = DELETE'); } catch (e) {}
        }
        try { sqliteDb.pragma('busy_timeout = 5000'); } catch (e) {}

    // Run basic SQLite schema directly on this instance
    sqliteDb.exec(`
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
            "user" TEXT,
            type TEXT,
            severity TEXT DEFAULT 'Normal',
            "desc" TEXT
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
    `);

    provider = 'sqlite';
    console.log(`[Database] Connected to SQLite (Local Storage): ${DB_FILE}`);
    } catch (err) {
        console.error('[Database] Failed to initialize SQLite:', err.message);
    }
}

async function initPostgres() {
    const { Pool } = require('pg');
    // Supabase requires SSL with rejectUnauthorized: false in Node environments
    const isSupabase = DATABASE_URL.includes('supabase.co') || DATABASE_URL.includes('pooler.supabase.com');
    const sslConfig = isSupabase || process.env.PG_SSL === 'true' || !DATABASE_URL.includes('localhost')
        ? { rejectUnauthorized: false } 
        : undefined;

    pgPool = new Pool({
        connectionString: DATABASE_URL,
        ssl: sslConfig,
        max: 15,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });

    // Test connection
    const client = await pgPool.connect();
    try {
        console.log('[Database] Successfully connected to PostgreSQL / Supabase!');
        // Initialize schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            await client.query(schemaSql);
            console.log('[Database] PostgreSQL schema verified/initialized.');
        }
        provider = 'postgres';
    } finally {
        client.release();
    }
}

const isValidPgUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    return (trimmed.startsWith('postgres://') || trimmed.startsWith('postgresql://')) && 
           trimmed.includes('@') && 
           !trimmed.includes('[PASSWORD]') && 
           !trimmed.includes('[YOUR-PASSWORD]');
};

// Initialization promise
const readyPromise = (async () => {
    if (isValidPgUrl(DATABASE_URL)) {
        try {
            console.log('[Database] Attempting connection to PostgreSQL...');
            await initPostgres();
            return;
        } catch (err) {
            console.warn(`[Database] PostgreSQL connection failed: ${err.message}`);
            if (err.code === 'ENETUNREACH' || (DATABASE_URL && DATABASE_URL.includes('db.') && DATABASE_URL.includes('.supabase.co'))) {
                console.warn('⚠️  [Database] IPv6 Error: Render does not support outbound IPv6 connections (db.*.supabase.co).');
                console.warn('⚠️  [Database] Fix: In your Supabase Dashboard, click "Connect" -> select "Connection Pooler" (pooler.supabase.com:6543 or 5432) which supports IPv4!');
            }
            console.warn('[Database] Falling back to local SQLite so your app stays fully functional.');
        }
    } else {
        if (DATABASE_URL && DATABASE_URL.trim().length > 0) {
            console.warn(`[Database] Provided DATABASE_URL is not a valid PostgreSQL connection string. Falling back to local SQLite.`);
        } else {
            console.log('[Database] No DATABASE_URL found. Running with local SQLite database.');
        }
    }
    initSqlite();
})();

const db = {
    ready: () => readyPromise,
    get isPostgres() { return provider === 'postgres'; },
    get providerName() { return provider === 'postgres' ? 'PostgreSQL (Supabase)' : 'SQLite (Local Fallback)'; },

    // Execute query and return all matching rows as Array
    async all(sql, ...args) {
        await readyPromise;
        const params = normalizeParams(args);
        if (provider === 'postgres') {
            const pgSql = convertPlaceholders(sql);
            const res = await pgPool.query(pgSql, params);
            return res.rows.map(normalizeRow);
        } else {
            return sqliteDb.prepare(sql).all(...params);
        }
    },

    // Execute query and return the first matching row or undefined
    async get(sql, ...args) {
        await readyPromise;
        const params = normalizeParams(args);
        if (provider === 'postgres') {
            const pgSql = convertPlaceholders(sql);
            const res = await pgPool.query(pgSql, params);
            return res.rows[0] ? normalizeRow(res.rows[0]) : undefined;
        } else {
            return sqliteDb.prepare(sql).get(...params);
        }
    },

    // Execute INSERT, UPDATE, DELETE and return { lastInsertRowid, changes }
    async run(sql, ...args) {
        await readyPromise;
        const params = normalizeParams(args);
        if (provider === 'postgres') {
            let pgSql = convertPlaceholders(sql);
            const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
            const hasReturning = /RETURNING/i.test(pgSql);
            if (isInsert && !hasReturning) {
                pgSql += ' RETURNING id';
            }
            const res = await pgPool.query(pgSql, params);
            const rawId = res.rows && res.rows[0] && res.rows[0].id ? res.rows[0].id : null;
            const lastId = rawId !== null && !isNaN(Number(rawId)) ? Number(rawId) : rawId;
            return {
                lastInsertRowid: lastId,
                changes: res.rowCount || 0
            };
        } else {
            const stmt = sqliteDb.prepare(sql);
            return stmt.run(...params);
        }
    },

    // Execute raw multiple SQL statements (DDL)
    async exec(sql) {
        await readyPromise;
        if (provider === 'postgres') {
            return pgPool.query(sql);
        } else {
            return sqliteDb.exec(sql);
        }
    },

    // Statement-like helper for compatibility
    prepare(sql) {
        return {
            get: (...args) => db.get(sql, ...args),
            all: (...args) => db.all(sql, ...args),
            run: (...args) => db.run(sql, ...args)
        };
    },

    // Transaction runner
    async transaction(callback) {
        await readyPromise;
        if (provider === 'postgres') {
            const client = await pgPool.connect();
            try {
                await client.query('BEGIN');
                const txObj = {
                    get: async (sql, ...args) => {
                        const params = normalizeParams(args);
                        const res = await client.query(convertPlaceholders(sql), params);
                        return res.rows[0] ? normalizeRow(res.rows[0]) : undefined;
                    },
                    all: async (sql, ...args) => {
                        const params = normalizeParams(args);
                        const res = await client.query(convertPlaceholders(sql), params);
                        return res.rows.map(normalizeRow);
                    },
                    run: async (sql, ...args) => {
                        const params = normalizeParams(args);
                        let pgSql = convertPlaceholders(sql);
                        const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
                        const hasReturning = /RETURNING/i.test(pgSql);
                        if (isInsert && !hasReturning) {
                            pgSql += ' RETURNING id';
                        }
                        const res = await client.query(pgSql, params);
                        const rawId = res.rows && res.rows[0] && res.rows[0].id ? res.rows[0].id : null;
                        const lastId = rawId !== null && !isNaN(Number(rawId)) ? Number(rawId) : rawId;
                        return {
                            lastInsertRowid: lastId,
                            changes: res.rowCount || 0
                        };
                    },
                    prepare: (sql) => ({
                        get: (...args) => txObj.get(sql, ...args),
                        all: (...args) => txObj.all(sql, ...args),
                        run: (...args) => txObj.run(sql, ...args)
                    })
                };
                const result = await callback(txObj);
                await client.query('COMMIT');
                return result;
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        } else {
            // SQLite transaction
            const tx = sqliteDb.transaction((txCallback) => {
                return txCallback();
            });
            // We pass db wrapper to callback
            return callback(db);
        }
    },

    // Close connections
    async close() {
        if (pgPool) await pgPool.end();
        if (sqliteDb) sqliteDb.close();
    }
};

module.exports = db;
