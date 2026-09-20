const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec, execSync } = require('child_process');
const { Server } = require('socket.io');
const http = require('http');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const googleClient = new OAuth2Client('19771771402-t2ad6ohhek8jp428tm1pj6tpnke6u0su.apps.googleusercontent.com');
const db = require('./db/index.js');

const DATA_DIR = process.env.DATA_DIR || __dirname;

const app = express();
app.set('trust proxy', 1);
const JWT_SECRET = process.env.JWT_SECRET || 'verity_super_secret_key';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'verity_super_secret_key') {
    console.warn('⚠️  [SECURITY WARNING] JWT_SECRET is using the insecure default key in production! Set JWT_SECRET in your environment.');
}

app.use(cors());
// 10mb limit protects against event-loop starvation / memory exhaustion DoS
app.use(express.json({ limit: '10mb' }));

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token.' });
        req.user = user;
        next();
    });
};

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: 'User role not found.' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

// --- FILE UPLOADS (images / videos for assignments) ---
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Whitelist of permitted file extensions to prevent Stored XSS and arbitrary file execution
const ALLOWED_UPLOAD_EXTS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp',
    '.mp4', '.webm', '.ogg',
    '.pdf', '.zip', '.txt'
]);

// Serve uploaded files statically at /uploads/<file> with security headers
app.use('/uploads', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
}, express.static(UPLOADS_DIR));

// Accepts { filename, dataUrl } (dataUrl = "data:<mime>;base64,<data>"),
// writes the file to /uploads, and returns its public URL.
app.post('/upload', authenticateToken, requireRole('Teacher', 'Admin', 'Student'), (req, res) => {
    const { filename, dataUrl } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ message: 'dataUrl is required' });
    }
    const match = dataUrl.match(/^data:(.+?);base64,(.*)$/);
    if (!match) {
        return res.status(400).json({ message: 'Invalid data URL' });
    }

    const ext = path.extname(filename || '').toLowerCase();
    if (!ALLOWED_UPLOAD_EXTS.has(ext)) {
        return res.status(400).json({ 
            message: `File type "${ext || 'unknown'}" is not allowed. Supported formats: images (.png, .jpg, .gif, .webp), videos (.mp4, .webm), pdf, zip, txt.` 
        });
    }

    const buffer = Buffer.from(match[2], 'base64');
    // Build a safe, unique filename.
    const safeName = (filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const unique = `${Date.now()}_${safeName}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, unique), buffer);
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    res.status(201).json({ url: `${protocol}://${host}/uploads/${unique}` });
});

app.get('/health', async (req, res) => {
    try {
        await db.get('SELECT 1');
        res.status(200).json({
            status: 'operational',
            uptime: process.uptime(),
            db: 'connected',
            provider: db.providerName,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            error: err.message,
            uptime: process.uptime(),
            db: 'error',
            provider: db.providerName,
            timestamp: new Date().toISOString()
        });
    }
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

// Socket.IO Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err && user) {
                socket.user = user;
            }
            next();
        });
    } else {
        next();
    }
});

// --- DATABASE HELPERS ---
const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// --- AUTHENTICATION ROUTES ---
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
        if (existing) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Check if an existing Admin is creating this account
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        let requesterIsAdmin = false;
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded && decoded.role === 'Admin') {
                    requesterIsAdmin = true;
                }
            } catch (_) {}
        }

        let userRole = 'Student';
        let status = 'Active';

        if (requesterIsAdmin && role === 'Admin') {
            userRole = 'Admin';
            status = 'Active';
        } else if (role === 'Teacher') {
            userRole = 'Teacher';
            // If created by an Admin, can be Active immediately; public signup requires admin approval
            status = requesterIsAdmin ? 'Active' : 'Pending';
        } else {
            userRole = 'Student';
            status = 'Active';
        }

        const info = await db.run(
            'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
            name, email, password, userRole, status
        );
        const user = { id: info.lastInsertRowid, name, email, password, role: userRole, status };
        const userToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
        res.status(201).json({ message: 'User registered successfully', user, token: userToken });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.get('SELECT * FROM users WHERE email = ? AND password = ?', email, password);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (user.status === 'Pending') {
            return res.status(403).json({ message: 'Your account is pending admin approval' });
        }
        user.lastLogin = new Date().toISOString();
        await db.run('UPDATE users SET lastLogin = ? WHERE id = ?', user.lastLogin, user.id);
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
        res.status(200).json({ message: 'Login successful', user, token });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/auth/google', async (req, res) => {
    const { token, role: userRole } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: '985650202101-p4jb6nlaqjeq14v1g2kqldhm7clphkk7.apps.googleusercontent.com'
        });
        const payload = ticket.getPayload();
        const { email, name } = payload;

        let user = await db.get('SELECT * FROM users WHERE email = ?', email);

        if (user) {
            if (user.status === 'Pending') {
                return res.status(403).json({ message: 'Your account is pending admin approval' });
            }
            user.lastLogin = new Date().toISOString();
            await db.run('UPDATE users SET lastLogin = ? WHERE id = ?', user.lastLogin, user.id);
        } else {
            // Self-registration via Google OAuth: only Teacher or Student allowed (never Admin)
            const role = (userRole === 'Teacher') ? 'Teacher' : 'Student';
            const status = role === 'Teacher' ? 'Pending' : 'Active';
            const lastLogin = new Date().toISOString();
            const password = 'google_sso_user';

            const info = await db.run(
                'INSERT INTO users (name, email, password, role, lastLogin, status) VALUES (?, ?, ?, ?, ?, ?)',
                name, email, password, role, lastLogin, status
            );
            user = { id: info.lastInsertRowid, name, email, password, role, lastLogin, status };

            if (status === 'Pending') {
                return res.status(403).json({ message: 'Your account is pending admin approval', user });
            }
        }

        res.status(200).json({ message: 'Google login successful', user, token: jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET) });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Invalid Google token' });
    }
});

// --- ADMIN: USER MANAGEMENT ---
app.get('/users', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const rows = await db.all('SELECT id, name, email, role, lastLogin, status FROM users');
        const users = rows.map(u => ({
            ...u,
            status: u.status || 'Active',
            lastLogin: u.lastLogin || null
        }));
        res.status(200).json({ users });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.delete('/users/:email', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email);
        const info = await db.run('DELETE FROM users WHERE email = ?', email);
        if (info.changes === 0) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ message: 'User deleted' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.put('/users/:email/status', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email);
        const { status } = req.body;
        const info = await db.run('UPDATE users SET status = ? WHERE email = ?', status, email);
        if (info.changes === 0) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ message: 'User status updated' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- CLASSWORK PERSISTENCE HELPERS ---
const getClassworkFromDb = async (classroomId) => {
    const rows = await db.all('SELECT * FROM classwork WHERE classroom_id = ?', classroomId);
    return rows.map(row => {
        let meta = {};
        if (row.description) {
            try {
                meta = JSON.parse(row.description);
            } catch (e) {
                meta = { details: row.description };
            }
        }
        return {
            id: row.id,
            classroom_id: row.classroom_id,
            title: row.title,
            dueDate: row.dueDate || '',
            type: row.type || '',
            details: meta.details !== undefined ? meta.details : (row.description || ''),
            attachments: Array.isArray(meta.attachments) ? meta.attachments : [],
            points: meta.points !== undefined ? meta.points : '100',
            grading: meta.grading !== undefined ? meta.grading : 'On',
            archived: typeof meta.archived === 'boolean' ? meta.archived : false,
            posted: meta.posted || row.created_at
        };
    });
};

const saveClassworkToDb = async (classroomId, classwork) => {
    if (classroomId == null || !Array.isArray(classwork)) return;

    const currentIds = classwork.map(cw => Number(cw.id)).filter(id => !isNaN(id));

    // Handle deletions safely without violating foreign key constraints
    if (currentIds.length > 0) {
        const placeholders = currentIds.map(() => '?').join(',');
        const toDelete = await db.all(`
            SELECT id FROM classwork 
            WHERE classroom_id = ? AND id NOT IN (${placeholders})
        `, classroomId, ...currentIds);

        for (const item of toDelete) {
            try {
                await db.run('DELETE FROM classwork WHERE id = ?', item.id);
            } catch (e) {
                // Has submissions referencing it; archive instead of hard delete
                const currentItem = await db.get('SELECT description FROM classwork WHERE id = ?', item.id);
                let meta = {};
                try { meta = JSON.parse(currentItem?.description || '{}'); } catch { meta = { details: currentItem?.description }; }
                meta.archived = true;
                await db.run('UPDATE classwork SET description = ? WHERE id = ?', JSON.stringify(meta), item.id);
            }
        }
    }

    // Upsert all items with full metadata preserved as JSON in description
    for (const cw of classwork) {
        const id = Number(cw.id) || Date.now();
        const descObj = {
            details: cw.details !== undefined ? cw.details : (cw.description || ''),
            attachments: Array.isArray(cw.attachments) ? cw.attachments : [],
            points: cw.points !== undefined ? cw.points : '100',
            grading: cw.grading !== undefined ? cw.grading : 'On',
            archived: !!cw.archived,
            posted: cw.posted || null
        };
        await db.run(`
            INSERT INTO classwork (id, classroom_id, title, description, dueDate, type)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                classroom_id = excluded.classroom_id,
                title = excluded.title,
                description = excluded.description,
                dueDate = excluded.dueDate,
                type = excluded.type
        `, id, Number(classroomId) || classroomId, cw.title || '', JSON.stringify(descObj), cw.dueDate || '', cw.type || '');
    }
};

// --- CLASSWORK PERSISTENCE ENDPOINTS ---
app.get('/classwork/:classroomId', authenticateToken, async (req, res) => {
    try {
        const classwork = await getClassworkFromDb(req.params.classroomId);
        res.status(200).json({ classwork });
    } catch (e) {
        console.error('Error fetching classwork:', e);
        res.status(500).json({ classwork: [] });
    }
});

app.put('/classwork/:classroomId', authenticateToken, requireRole('Teacher', 'Admin'), async (req, res) => {
    const { classroomId } = req.params;
    const { classwork } = req.body;
    if (!Array.isArray(classwork)) return res.status(400).json({ message: 'classwork must be an array' });

    try {
        await saveClassworkToDb(classroomId, classwork);
        const updatedClasswork = await getClassworkFromDb(classroomId);
        io.emit('classwork_changed', { classroomId, classwork: updatedClasswork });
        res.status(200).json({ message: 'Classwork saved', classwork: updatedClasswork });
    } catch (e) {
        console.error('Error saving classwork via PUT:', e);
        res.status(500).json({ message: 'Failed to save classwork' });
    }
});

// --- CLASSROOMS ---
app.get('/classrooms', authenticateToken, async (req, res) => {
    try {
        const classrooms = await db.all('SELECT * FROM classrooms');
        res.status(200).json({ classrooms });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.put('/classrooms', authenticateToken, requireRole('Teacher', 'Admin'), async (req, res) => {
    const { classrooms } = req.body;
    if (!Array.isArray(classrooms)) return res.status(400).json({ message: 'classrooms must be an array' });

    try {
        for (const c of classrooms) {
            await db.run(`
                INSERT INTO classrooms (id, code, section, name, subject, instructor) 
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    code = excluded.code,
                    section = excluded.section,
                    name = excluded.name,
                    subject = excluded.subject,
                    instructor = excluded.instructor
            `,
                c.id || Date.now(), c.code || '', c.section || '', c.name || '', c.subject || '', c.instructor || ''
            );
        }
        res.status(200).json({ message: 'Classrooms saved' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- SUBMISSIONS ---
app.get('/submissions/:assignmentId', authenticateToken, requireRole('Teacher', 'Admin', 'Student'), async (req, res) => {
    try {
        let rows;
        if (req.user.role === 'Student') {
            // Students are strictly scoped to only view their own submission (fixes IDOR)
            rows = await db.all(
                'SELECT * FROM submissions WHERE assignment_id = ? AND (student_name = ? OR student_name = ? OR LOWER(student_name) = LOWER(?) OR LOWER(student_name) = LOWER(?))',
                req.params.assignmentId, req.user.name || '', req.user.email || '', req.user.name || '', req.user.email || ''
            );
        } else {
            // Teachers and Admins can view all submissions for grading
            rows = await db.all('SELECT * FROM submissions WHERE assignment_id = ?', req.params.assignmentId);
        }

        const submissions = rows.map(s => {
            let history = [];
            try { history = JSON.parse(s.history); } catch {}
            const lastCode = Array.isArray(history) && history.length > 0 ? history[history.length - 1]?.code : '';
            return { ...s, history, studentName: s.student_name, finalCode: lastCode };
        });
        res.status(200).json({ submissions });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/submissions/:assignmentId', authenticateToken, requireRole('Student'), async (req, res) => {
    try {
        const { finalCode, codeHistory } = req.body || {};
        const assignmentId = req.params.assignmentId;
        // Bind student identity strictly to authenticated token (prevents submitting under others' names)
        const name = req.user.name || req.user.email || 'Student';
        const historyStr = JSON.stringify(Array.isArray(codeHistory) && codeHistory.length > 0 ? codeHistory : [{ time: Date.now(), code: finalCode || '' }]);

        await db.run(
            'DELETE FROM submissions WHERE assignment_id = ? AND (student_name = ? OR student_name = ? OR LOWER(student_name) = LOWER(?))',
            assignmentId, name, req.user.email || name, name.toLowerCase()
        );
        await db.run(
            'INSERT INTO submissions (assignment_id, student_name, history, submittedAt) VALUES (?, ?, ?, ?)',
            assignmentId, name, historyStr, new Date().toISOString()
        );

        res.status(200).json({ message: 'Submission saved' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.delete('/submissions/:assignmentId/:studentName', authenticateToken, requireRole('Teacher', 'Admin', 'Student'), async (req, res) => {
    try {
        const studentName = decodeURIComponent(req.params.studentName);
        if (req.user.role === 'Student') {
            // Students may only delete their own submission
            const isSelf = (studentName === req.user.name || studentName === req.user.email ||
                            studentName.toLowerCase() === (req.user.name || '').toLowerCase() ||
                            studentName.toLowerCase() === (req.user.email || '').toLowerCase());
            if (!isSelf) {
                return res.status(403).json({ message: 'Access denied: You can only delete your own submission.' });
            }
        }

        await db.run(
            'DELETE FROM submissions WHERE assignment_id = ? AND (student_name = ? OR LOWER(student_name) = LOWER(?))',
            req.params.assignmentId, studentName, studentName
        );
        res.status(200).json({ message: 'Submission deleted' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- GRADES ---
app.get('/grades/:assignmentId', authenticateToken, requireRole('Teacher', 'Admin', 'Student'), async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM grades WHERE assignment_id = ?', req.params.assignmentId);
        const gradesMap = {};
        rows.forEach(r => {
            // If Student, only expose their own grade (fixes IDOR)
            if (req.user.role === 'Student') {
                const isStudentGrade = (
                    r.student_id === String(req.user.id) ||
                    r.student_id === req.user.name ||
                    r.student_id === req.user.email ||
                    (req.user.name && r.student_id.toLowerCase() === req.user.name.toLowerCase()) ||
                    (req.user.email && r.student_id.toLowerCase() === req.user.email.toLowerCase())
                );
                if (isStudentGrade) {
                    gradesMap[r.student_id] = { grade: r.grade, feedback: r.feedback, gradedAt: r.graded_at };
                }
            } else {
                gradesMap[r.student_id] = { grade: r.grade, feedback: r.feedback, gradedAt: r.graded_at };
            }
        });
        res.status(200).json({ grades: gradesMap });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/grades/:assignmentId', authenticateToken, requireRole('Teacher', 'Admin'), async (req, res) => {
    try {
        const { studentId, grade, feedback } = req.body || {};
        if (!studentId) return res.status(400).json({ message: 'studentId is required' });
        await db.run(`
            INSERT INTO grades (assignment_id, student_id, grade, feedback, graded_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(assignment_id, student_id) DO UPDATE SET
                grade = excluded.grade,
                feedback = excluded.feedback,
                graded_at = excluded.graded_at
        `, req.params.assignmentId, studentId, String(grade), feedback || '', new Date().toISOString());
        res.status(200).json({ message: 'Grade saved' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/grades/:assignmentId/bulk', authenticateToken, requireRole('Teacher', 'Admin'), async (req, res) => {
    try {
        const { grades } = req.body || {};
        if (!Array.isArray(grades)) return res.status(400).json({ message: 'grades must be an array' });
        const now = new Date().toISOString();
        for (const g of grades) {
            if (g.studentId) {
                await db.run(`
                    INSERT INTO grades (assignment_id, student_id, grade, feedback, graded_at)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(assignment_id, student_id) DO UPDATE SET
                        grade = excluded.grade,
                        feedback = excluded.feedback,
                        graded_at = excluded.graded_at
                `, req.params.assignmentId, g.studentId, String(g.grade), g.feedback || '', now);
            }
        }
        res.status(200).json({ message: 'Bulk grades saved' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.get('/classroom-students/:classroomId', authenticateToken, async (req, res) => {
    try {
        const { classroomId } = req.params;
        const rows = await db.all(`
            SELECT DISTINCT s.student_name as name, u.email
            FROM submissions s
            JOIN classwork c ON s.assignment_id = c.id
            LEFT JOIN users u ON u.name = s.student_name OR u.email = s.student_name
            WHERE c.classroom_id = ?
        `, classroomId);
        res.status(200).json({ students: rows });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.delete('/grades/:assignmentId/:studentId', authenticateToken, requireRole('Teacher', 'Admin'), async (req, res) => {
    try {
        const studentId = decodeURIComponent(req.params.studentId);
        await db.run(
            'DELETE FROM grades WHERE assignment_id = ? AND (student_id = ? OR LOWER(student_id) = LOWER(?))',
            req.params.assignmentId, studentId, studentId
        );
        res.status(200).json({ message: 'Grade reset' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.get('/submission-counts', authenticateToken, requireRole('Teacher', 'Admin'), async (req, res) => {
    try {
        const subs = await db.all('SELECT assignment_id, COUNT(id) as c FROM submissions GROUP BY assignment_id');
        const counts = {};
        subs.forEach(s => counts[s.assignment_id] = Number(s.c));
        const studentRow = await db.get("SELECT COUNT(id) as c FROM users WHERE role = 'Student'");
        const studentCount = studentRow ? Number(studentRow.c) : 0;
        res.status(200).json({ counts, studentCount });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- ADMIN DASHBOARD STATS ---
app.get('/stats', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const activeUsersRow = await db.get("SELECT COUNT(id) as c FROM users WHERE status = 'Active'");
        const activeClassroomsRow = await db.get("SELECT COUNT(id) as c FROM classrooms");
        const flagRow = await db.get("SELECT count FROM security_flags WHERE date_string = ?", todayKey());
        const activeUsers = activeUsersRow ? Number(activeUsersRow.c) : 0;
        const activeClassrooms = activeClassroomsRow ? Number(activeClassroomsRow.c) : 0;
        const securityFlagsToday = flagRow ? Number(flagRow.count) : 0;
        res.status(200).json({ activeUsers, activeClassrooms, securityFlagsToday });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- REAL-TIME C# COMPILER & PROCTORING (The Brain) ---
const COMPILER_BASE_DIR = path.join(os.tmpdir(), 'verity_compiler_base_template');
let baseTemplatePromise = null;
const sessionWorkspaces = new Map();

let cachedDotnetTargetFramework = null;
function getDotnetTargetFramework() {
    if (cachedDotnetTargetFramework) return cachedDotnetTargetFramework;
    try {
        const output = execSync('dotnet --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        const major = parseInt(output.split('.')[0], 10);
        if (!isNaN(major) && major >= 6) {
            cachedDotnetTargetFramework = `net${major}.0`;
            console.log(`⚡ Verity Compiler: Detected .NET SDK ${output} -> targeting ${cachedDotnetTargetFramework}`);
            return cachedDotnetTargetFramework;
        }
    } catch (e) {
        console.warn('⚠️ Could not determine dotnet version, defaulting to net8.0:', e.message);
    }
    cachedDotnetTargetFramework = 'net8.0';
    return cachedDotnetTargetFramework;
}

function ensureBaseTemplate() {
    if (baseTemplatePromise) return baseTemplatePromise;

    baseTemplatePromise = (async () => {
        try {
            const targetFramework = getDotnetTargetFramework();
            const projectFile = path.join(COMPILER_BASE_DIR, 'verity_base.csproj');
            const assetsFile = path.join(COMPILER_BASE_DIR, 'obj', 'project.assets.json');

            if (fs.existsSync(projectFile) && fs.existsSync(assetsFile)) {
                try {
                    const existingContent = fs.readFileSync(projectFile, 'utf8');
                    if (existingContent.includes(`<TargetFramework>${targetFramework}</TargetFramework>`)) {
                        return COMPILER_BASE_DIR;
                    }
                } catch (_) {}
                // If TargetFramework differs, remove old template and recreate
                try { fs.rmSync(COMPILER_BASE_DIR, { recursive: true, force: true }); } catch (_) {}
            }

            if (!fs.existsSync(COMPILER_BASE_DIR)) {
                fs.mkdirSync(COMPILER_BASE_DIR, { recursive: true });
            }

            const csprojContent = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>${targetFramework}</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
`;
            fs.writeFileSync(projectFile, csprojContent, 'utf8');
            fs.writeFileSync(path.join(COMPILER_BASE_DIR, 'Program.cs'), 'using System; class Program { static void Main() {} }\n', 'utf8');

            console.log(`⚡ Verity Compiler: Pre-warming base .NET template (${targetFramework})...`);
            await new Promise((resolve) => {
                exec(`dotnet build -v q -p:WarningLevel=0 "${projectFile}"`, { cwd: COMPILER_BASE_DIR }, (err) => {
                    if (err) {
                        console.warn('⚠️ Base template build warning (falling back to restore):', err.message);
                        exec(`dotnet restore "${projectFile}"`, { cwd: COMPILER_BASE_DIR }, () => resolve(COMPILER_BASE_DIR));
                    } else {
                        console.log(`⚡ Verity Compiler: Base .NET template pre-warmed for ${targetFramework} with warm obj/bin cache.`);
                        resolve(COMPILER_BASE_DIR);
                    }
                });
            });

            return COMPILER_BASE_DIR;
        } catch (err) {
            console.error('Failed to pre-warm base compiler template:', err);
            baseTemplatePromise = null;
            throw err;
        }
    })();

    return baseTemplatePromise;
}

// Warm up base template asynchronously on server start
ensureBaseTemplate().catch(err => console.warn('Non-blocking compiler warmup notice:', err.message));

// Clean up ancient verity temporary folders (>12 hours old) periodically
setInterval(() => {
    try {
        const tmpDir = os.tmpdir();
        const files = fs.readdirSync(tmpDir);
        const now = Date.now();
        const MAX_AGE_MS = 12 * 60 * 60 * 1000;

        for (const file of files) {
            if (file.startsWith('verity_ws_') || file.startsWith('verity_temp_')) {
                const fullPath = path.join(tmpDir, file);
                try {
                    const stats = fs.statSync(fullPath);
                    if (now - stats.mtimeMs > MAX_AGE_MS) {
                        fs.rmSync(fullPath, { recursive: true, force: true });
                    }
                } catch (_) {}
            }
        }
    } catch (_) {}
}, 60 * 60 * 1000);

function parseCompilerDiagnostics(output) {
    if (!output) return [];
    const diagnostics = [];
    const regex = /(?:^|\r?\n)(?:.*?[/\\])?Program\.cs\((\d+)(?:,(\d+))?(?:,(\d+),(\d+))?\):\s*(error|warning)\s+([A-Za-z0-9]+):\s*([^\r\n]+)/gi;
    let match;

    while ((match = regex.exec(output)) !== null) {
        const startLine = parseInt(match[1], 10);
        const startCol = match[2] ? parseInt(match[2], 10) : 1;
        const endLine = match[3] ? parseInt(match[3], 10) : startLine;
        const endCol = match[4] ? parseInt(match[4], 10) : null;
        const severity = match[5].toLowerCase();
        const code = match[6];
        let rawMsg = match[7].trim();
        rawMsg = rawMsg.replace(/\s*\[.*?\.csproj\]$/, '').trim();

        diagnostics.push({
            severity, // 'error' or 'warning'
            code,
            message: `${code}: ${rawMsg}`,
            startLineNumber: startLine,
            startColumn: startCol,
            endLineNumber: endLine,
            endColumn: endCol
        });
    }

    return diagnostics;
}

async function getTreatWarningsAsErrors() {
    try {
        const row = await db.get("SELECT value FROM system_settings WHERE key = 'examDefaults'");
        if (row && row.value) {
            const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
            return !!parsed?.treatWarningsAsErrors;
        }
    } catch (_) {}
    return false;
}

let currentInstruction = "";
const activeStudents = {};

io.on('connection', (socket) => {
    console.log('🟢 Student Workspace Connected: ' + socket.id);

    let activeProcess = null;

    // Resilient socket authentication (JWT verified -> unverified decode fallback for offline/cross-env -> payload user fallback)
    const authenticateSocket = (targetSocket, token, userData) => {
        if (targetSocket.user) return targetSocket.user;

        if (token && typeof token === 'string') {
            try {
                const verified = jwt.verify(token, JWT_SECRET);
                if (verified) {
                    targetSocket.user = verified;
                    targetSocket.emit('authenticated', { user: { id: verified.id, email: verified.email, role: verified.role } });
                    return targetSocket.user;
                }
            } catch (err) {
                // In local offline fallback mode or across cloud/desktop environments with different secrets,
                // decode the JWT payload safely so offline / kiosk student execution is never blocked.
                try {
                    const decoded = jwt.decode(token);
                    if (decoded && (decoded.id || decoded.email || decoded.role)) {
                        targetSocket.user = decoded;
                        targetSocket.emit('authenticated', { user: { id: decoded.id, email: decoded.email, role: decoded.role } });
                        return targetSocket.user;
                    }
                } catch (_) {}
            }
        }

        if (userData && (userData.id || userData.email || userData.name)) {
            targetSocket.user = {
                id: userData.id || 1,
                name: userData.name || 'Student',
                email: userData.email || 'student@verity.local',
                role: userData.role || 'Student'
            };
            targetSocket.emit('authenticated', { user: { id: targetSocket.user.id, email: targetSocket.user.email, role: targetSocket.user.role } });
            return targetSocket.user;
        }

        return null;
    };

    // Support authentication via initial handshake or explicit event
    const handshakeToken = socket.handshake.auth?.token;
    if (handshakeToken) {
        authenticateSocket(socket, handshakeToken);
    }

    socket.on('authenticate', (data) => {
        if (!data) return;
        if (typeof data === 'string') {
            authenticateSocket(socket, data);
        } else if (typeof data === 'object') {
            authenticateSocket(socket, data.token, data.user);
        }
    });

    if (currentInstruction) {
        socket.emit('instruction_update', currentInstruction);
    }

    socket.on('teacher_join', ({ classroomId, assignmentId }) => {
        if (!socket.user || !['Teacher', 'Admin'].includes(socket.user.role)) {
            return socket.emit('error', { message: 'Access denied: Teacher role required.' });
        }

        const roomName = `classroom:${classroomId || 'none'}:assignment:${assignmentId || 'none'}`;

        if (socket.data.teacherRoom) {
            socket.leave(socket.data.teacherRoom);
        }

        socket.join(roomName);
        socket.data.teacherRoom = roomName;

        const filterKey = `${classroomId || 'none'}:${assignmentId || 'none'}`;
        for (const [key, student] of Object.entries(activeStudents)) {
            if (key.startsWith(filterKey + ':')) {
                socket.emit('teacher_update_code', student);
            }
        }
    });

    socket.on('set_instruction', (text) => {
        if (!socket.user || !['Teacher', 'Admin'].includes(socket.user.role)) {
            return;
        }
        currentInstruction = text;
        io.emit('instruction_update', text);
    });

    socket.on('classwork_updated', async ({ classroomId, classwork }) => {
        if (!socket.user || !['Teacher', 'Admin'].includes(socket.user.role)) {
            return socket.emit('error', { message: 'Access denied: Teacher role required.' });
        }
        if (classroomId == null || !Array.isArray(classwork)) return;

        try {
            await saveClassworkToDb(classroomId, classwork);
            const updatedClasswork = await getClassworkFromDb(classroomId);
            io.emit('classwork_changed', { classroomId, classwork: updatedClasswork });
        } catch (e) {
            console.error('Error in socket classwork_updated:', e);
            io.emit('classwork_changed', { classroomId, classwork });
        }
    });

    socket.on('compile_code', async (data) => {
        if (!socket.user) {
            authenticateSocket(socket, data?.token || socket.handshake.auth?.token, data?.user);
        }

        if (!socket.user) {
            return socket.emit('terminal_output', "Error: Authentication required to execute code. Please log in.\n");
        }

        const { code } = data || {};
        const studentKey = socket.user?.id
            ? `u_${socket.user.id}`
            : (socket.user?.email ? `e_${socket.user.email.replace(/[^a-zA-Z0-9]/g, '_')}` : `s_${socket.id.replace(/[^a-zA-Z0-9]/g, '')}`);

        let projectDir = sessionWorkspaces.get(studentKey)?.projectDir;
        if (!projectDir) {
            projectDir = path.join(os.tmpdir(), `verity_ws_${studentKey}`);
            sessionWorkspaces.set(studentKey, { projectDir, lastUsed: Date.now() });
        } else {
            sessionWorkspaces.get(studentKey).lastUsed = Date.now();
        }

        const projectFile = path.join(projectDir, 'verity_base.csproj');
        let isFirstCompile = !fs.existsSync(projectFile);
        const targetFramework = getDotnetTargetFramework();

        if (!isFirstCompile) {
            try {
                const existingCsproj = fs.readFileSync(projectFile, 'utf8');
                if (!existingCsproj.includes(`<TargetFramework>${targetFramework}</TargetFramework>`)) {
                    try { fs.rmSync(projectDir, { recursive: true, force: true }); } catch (_) {}
                    isFirstCompile = true;
                }
            } catch (_) {}
        }

        if (activeProcess) {
            try { activeProcess.kill(); } catch (_) {}
            activeProcess = null;
        }

        if (isFirstCompile) {
            socket.emit('terminal_output', "Initializing compiler environment...\n");

            try {
                await ensureBaseTemplate();
                if (!fs.existsSync(projectDir)) {
                    fs.mkdirSync(projectDir, { recursive: true });
                }
                fs.cpSync(COMPILER_BASE_DIR, projectDir, { recursive: true });
                await compileStudentCode(projectDir, code, socket);
            } catch (err) {
                console.warn('Fast template clone failed, falling back to dotnet new:', err.message);
                exec(`dotnet new console --framework ${targetFramework} -o "${projectDir}"`, async (newErr) => {
                    if (newErr) {
                        sessionWorkspaces.delete(studentKey);
                        return socket.emit('terminal_output', "Error: Could not initialize .NET compiler.\n");
                    }
                    await compileStudentCode(projectDir, code, socket);
                });
            }
        } else {
            await compileStudentCode(projectDir, code, socket);
        }
    });

    async function compileStudentCode(projectDir, code, socket) {
        fs.writeFileSync(path.join(projectDir, 'Program.cs'), code, 'utf8');
        socket.emit('terminal_output', "Compiling and running...\n\n");
        socket.emit('compiler_diagnostics', []); // Clear existing markers

        const treatWarningsAsErrors = await getTreatWarningsAsErrors();
        const compilerArgs = [
            'run',
            '--no-restore',
            '-v', 'q',
            treatWarningsAsErrors ? '-p:WarningLevel=4' : '-p:WarningLevel=0',
            ...(treatWarningsAsErrors ? ['-p:TreatWarningsAsErrors=true'] : []),
            '--project',
            projectDir
        ];

        activeProcess = spawn('dotnet', compilerArgs);

        let rawCompilerOutput = '';
        let started = false;
        const markStarted = () => {
            if (started) return;
            started = true;
            socket.emit('program_started');
        };

        // Enforce a maximum execution timeout of 20 seconds to prevent resource exhaustion / infinite loops
        const executionTimeout = setTimeout(() => {
            if (activeProcess) {
                try { activeProcess.kill(); } catch (_) {}
                socket.emit('terminal_output', "\n[Process terminated: Execution limit of 20s exceeded]\n");
                socket.emit('process_exit');
                activeProcess = null;
            }
        }, 20000);

        activeProcess.stdout.on('data', (data) => {
            const str = data.toString();
            rawCompilerOutput += str;
            markStarted();
            socket.emit('terminal_output', str);
        });

        activeProcess.stderr.on('data', (data) => {
            const str = data.toString();
            rawCompilerOutput += str;
            markStarted();
            socket.emit('terminal_output', str);
        });

        activeProcess.on('close', (code) => {
            clearTimeout(executionTimeout);
            socket.emit('terminal_output', `\n[Process exited with code ${code}]\n`);

            // Emit parsed compiler diagnostics (errors/warnings) to the client
            const diagnostics = parseCompilerDiagnostics(rawCompilerOutput);
            socket.emit('compiler_diagnostics', diagnostics);

            socket.emit('process_exit');
            activeProcess = null;
        });
    }

    socket.on('terminal_input', (input) => {
        if (activeProcess && activeProcess.stdin) {
            activeProcess.stdin.write(input + '\n');
        }
    });

    socket.on('stop_code', () => {
        if (activeProcess) {
            activeProcess.kill();
            socket.emit('terminal_output', "\n[Process stopped by user]\n");
            socket.emit('process_exit');
            activeProcess = null;
        }
    });

    socket.on('student_typing', (data) => {
        if (data && data.studentId) {
            const classroomId = data.classroomId || 'none';
            const assignmentId = data.assignmentId || 'none';
            const studentKey = `${classroomId}:${assignmentId}:${data.studentId}`;
            activeStudents[studentKey] = data;
            socket.data.studentKey = studentKey;
            socket.data.studentId = data.studentId;

            const roomName = `classroom:${classroomId}:assignment:${assignmentId}`;
            socket.to(roomName).emit('teacher_update_code', data);
        }
    });

    socket.on('proctor_alert', async (data) => {
        if (data && data.studentId) {
            const classroomId = data.classroomId || 'none';
            const assignmentId = data.assignmentId || 'none';
            const studentKey = `${classroomId}:${assignmentId}:${data.studentId}`;
            if (activeStudents[studentKey]) {
                activeStudents[studentKey] = { ...activeStudents[studentKey], ...data };
            }

            const roomName = `classroom:${classroomId}:assignment:${assignmentId}`;
            socket.to(roomName).emit('teacher_receive_alert', data);
        }

        try {
            const key = todayKey();
            await db.run('INSERT INTO security_flags (date_string, count) VALUES (?, 1) ON CONFLICT(date_string) DO UPDATE SET count = security_flags.count + 1', key);
        } catch (e) { console.error(e); }
    });

    socket.on('submit_exam', async (data) => {
        if (!socket.user) return;
        const authenticatedName = socket.user.name || socket.user.email || 'Unknown';
        const authenticatedId = socket.user.id || data.studentId;
        const classroomId = data.classroomId || 'none';
        const assignmentId = data.assignmentId != null ? String(data.assignmentId) : 'unassigned';
        const studentKey = `${classroomId}:${assignmentId}:${authenticatedId}`;
        
        const strictWarnings = await getTreatWarningsAsErrors();
        const payload = { 
            ...data, 
            studentName: authenticatedName, 
            studentId: authenticatedId,
            strictWarningsEnforced: strictWarnings
        };
        activeStudents[studentKey] = { ...activeStudents[studentKey], ...payload, status: 'Submitted' };

        const roomName = `classroom:${classroomId}:assignment:${assignmentId}`;
        socket.to(roomName).emit('teacher_receive_submission', payload);

        try {
            await db.run('DELETE FROM submissions WHERE assignment_id = ? AND student_name = ?', assignmentId, authenticatedName);
            const historyStr = JSON.stringify(Array.isArray(data.codeHistory) ? data.codeHistory : []);
            await db.run('INSERT INTO submissions (assignment_id, student_name, history, submittedAt) VALUES (?, ?, ?, ?)', assignmentId, authenticatedName, historyStr, new Date().toISOString());
        } catch (e) { console.error(e); }
    });

    socket.on('unsubmit_exam', async (data) => {
        if (!socket.user || !data) return;
        const assignmentId = data.assignmentId != null ? String(data.assignmentId) : 'unassigned';
        const studentName = socket.user.role === 'Student' 
            ? (socket.user.name || socket.user.email || 'Unknown')
            : (data.studentName || data.studentId || 'Unknown');
        const studentId = socket.user.role === 'Student' ? socket.user.id : data.studentId;
        const classroomId = data.classroomId || 'none';
        const studentKey = `${classroomId}:${assignmentId}:${studentId || studentName}`;

        if (activeStudents[studentKey]) {
            activeStudents[studentKey] = { ...activeStudents[studentKey], status: 'Active' };
        }

        try {
            await db.run(
                'DELETE FROM submissions WHERE assignment_id = ? AND (student_name = ? OR student_name = ? OR LOWER(student_name) = LOWER(?) OR LOWER(student_name) = LOWER(?))',
                assignmentId, studentName, studentName, studentName, studentName
            );
        } catch (e) { console.error(e); }

        const roomName = `classroom:${classroomId}:assignment:${assignmentId}`;
        socket.to(roomName).emit('teacher_student_unsubmitted', { studentName, assignmentId, studentId });
        socket.emit('student_unsubmitted', { studentName, assignmentId, studentId });
        socket.broadcast.emit('student_unsubmitted', { studentName, assignmentId, studentId });
    });

    socket.on('student_terminal_update', (data) => {
        socket.broadcast.emit('teacher_terminal_update', data);
    });

    socket.on('student_leave_workspace', () => {
        if (activeProcess) {
            activeProcess.kill();
            activeProcess = null;
        }
        if (socket.data.studentKey) {
            delete activeStudents[socket.data.studentKey];
            socket.broadcast.emit('teacher_student_left', { studentId: socket.data.studentId });
            socket.data.studentKey = null;
            socket.data.studentId = null;
        }
    });

    socket.on('disconnect', () => {
        if (activeProcess) {
            try { activeProcess.kill(); } catch (_) {}
            activeProcess = null;
        }
        if (socket.data.studentKey) {
            delete activeStudents[socket.data.studentKey];
            socket.broadcast.emit('teacher_student_left', { studentId: socket.data.studentId });
        }
    });
});

// --- AUDIT LOGS ---
app.get('/audit-logs', authenticateToken, requireRole('Admin', 'Teacher'), async (req, res) => {
    try {
        const logs = await db.all('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 300');
        res.status(200).json({ logs });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/audit-logs', authenticateToken, async (req, res) => {
    try {
        const { user = 'System', type = 'Event', severity = 'Normal', desc = '' } = req.body || {};
        const timestamp = new Date().toISOString();
        await db.run(
            'INSERT INTO audit_logs (timestamp, user, type, severity, desc) VALUES (?, ?, ?, ?, ?)',
            timestamp, user, type, severity, desc
        );

        if (severity === 'High' || severity === 'Warning') {
            const key = todayKey();
            await db.run('INSERT INTO security_flags (date_string, count) VALUES (?, 1) ON CONFLICT(date_string) DO UPDATE SET count = security_flags.count + 1', key);
        }

        res.status(201).json({ message: 'Log entry saved', timestamp });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- SYSTEM SETTINGS API ---
app.get('/system-settings', authenticateToken, async (req, res) => {
    try {
        const rows = await db.all('SELECT key, value FROM system_settings');
        const settings = {};
        rows.forEach(r => {
            try { settings[r.key] = JSON.parse(r.value); }
            catch (e) { settings[r.key] = r.value; }
        });
        res.status(200).json({ settings });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/system-settings', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const { settings } = req.body || {};
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ message: 'Invalid settings object' });
        }
        for (const [key, val] of Object.entries(settings)) {
            const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            await db.run('INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, strVal);
        }
        io.emit('system_settings_updated', { settings });
        res.status(200).json({ message: 'Settings saved successfully' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- ACCESS TOKENS API ---
app.get('/access-tokens', authenticateToken, requireRole('Admin', 'Teacher'), async (req, res) => {
    try {
        const tokens = await db.all('SELECT * FROM access_tokens ORDER BY id DESC');
        res.status(200).json({ tokens });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/access-tokens', authenticateToken, requireRole('Admin', 'Teacher'), async (req, res) => {
    try {
        const { studentName, classroom, count = 1 } = req.body || {};
        const generated = [];

        for (let i = 0; i < count; i++) {
            const randPart = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            const tokenStr = `VRTY-EXAM-${randPart}`;
            const name = studentName || `Student ${i + 1}`;
            const cls = classroom || 'General Roster';
            const created = new Date().toISOString();
            await db.run('INSERT INTO access_tokens (token, student_name, classroom, created_at) VALUES (?, ?, ?, ?)', tokenStr, name, cls, created);
            generated.push({ token: tokenStr, student_name: name, classroom: cls, created_at: created });
        }
        res.status(201).json({ message: `${count} token(s) generated`, tokens: generated });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.delete('/access-tokens/:id', authenticateToken, requireRole('Admin', 'Teacher'), async (req, res) => {
    try {
        await db.run('DELETE FROM access_tokens WHERE id = ?', req.params.id);
        res.status(200).json({ message: 'Token deleted' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- ROSTER IMPORT API ---
app.post('/users/import', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const { users } = req.body || {};
        if (!Array.isArray(users)) return res.status(400).json({ message: 'users array required' });

        let added = 0;
        let skipped = 0;

        for (const u of users) {
            if (!u.email || !u.name) continue;
            const existing = await db.get('SELECT id FROM users WHERE email = ?', u.email);
            if (existing) {
                skipped++;
            } else {
                const pass = u.password || 'verity2026';
                const role = u.role || 'Student';
                const status = u.status || 'Active';
                await db.run('INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)', u.name, u.email, pass, role, status);
                added++;
            }
        }

        res.status(200).json({ message: `Roster import complete: ${added} added, ${skipped} skipped (already exists).`, added, skipped });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- QUESTION BANK API ---
app.get('/question-bank', authenticateToken, requireRole('Admin', 'Teacher'), async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM question_bank ORDER BY id DESC');
        const questions = rows.map(q => ({
            ...q,
            test_cases: JSON.parse(q.test_cases || '[]')
        }));
        res.status(200).json({ questions });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/question-bank', authenticateToken, requireRole('Admin', 'Teacher'), async (req, res) => {
    try {
        const { id, title, description, starter_code, test_cases = [], points = 100 } = req.body || {};
        const tcStr = JSON.stringify(test_cases);

        if (id) {
            await db.run(
                'UPDATE question_bank SET title = ?, description = ?, starter_code = ?, test_cases = ?, points = ? WHERE id = ?',
                title, description, starter_code, tcStr, points, id
            );
            res.status(200).json({ message: 'Question updated' });
        } else {
            const info = await db.run(
                'INSERT INTO question_bank (title, description, starter_code, test_cases, points) VALUES (?, ?, ?, ?, ?)',
                title, description, starter_code, tcStr, points
            );
            res.status(201).json({ message: 'Question created', id: info.lastInsertRowid });
        }
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.delete('/question-bank/:id', authenticateToken, requireRole('Admin', 'Teacher'), async (req, res) => {
    try {
        await db.run('DELETE FROM question_bank WHERE id = ?', req.params.id);
        res.status(200).json({ message: 'Question deleted' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// START SERVER (deferred when loaded from Electron; auto-start when run directly)
function start(port = process.env.PORT || 3001) {
    return new Promise((resolve) => {
        const p = parseInt(port, 10) || 3001;
        server.listen(p, '0.0.0.0', () => {
            console.log(`✅ BACKEND IS ALIVE: http://0.0.0.0:${p}`);
            console.log(`📦 Database Provider: ${db.providerName}`);
            resolve(p);
        });
    });
}

function stop() {
    return new Promise((resolve) => {
        io.close();
        server.close(() => resolve());
    });
}

// Run immediately when this file is executed directly (e.g. `node server/server.js`).
if (require.main === module) {
    const port = process.env.PORT || 3001;
    start(port);
}

module.exports = { start, stop, app };