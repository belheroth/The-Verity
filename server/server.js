const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const { Server } = require('socket.io');
const http = require('http');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const googleClient = new OAuth2Client('19771771402-t2ad6ohhek8jp428tm1pj6tpnke6u0su.apps.googleusercontent.com');
const db = require('./db/index.js');

const DATA_DIR = process.env.DATA_DIR || __dirname;

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'verity_super_secret_key';

app.use(cors());
// Raised body limit so base64 image/video uploads fit in the request body.
app.use(express.json({ limit: '200mb' }));

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
// Serve uploaded files statically at http://localhost:3001/uploads/<file>
app.use('/uploads', express.static(UPLOADS_DIR));

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
    const buffer = Buffer.from(match[2], 'base64');
    // Build a safe, unique filename.
    const safeName = (filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const unique = `${Date.now()}_${safeName}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, unique), buffer);
    res.status(201).json({ url: `http://localhost:3001/uploads/${unique}` });
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

// --- DATABASE HELPERS ---
const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// --- AUTHENTICATION ROUTES ---
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
        if (existing) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const userRole = role || 'Student';
        const status = userRole === 'Teacher' ? 'Pending' : 'Active';
        const info = await db.run(
            'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
            name, email, password, userRole, status
        );
        const user = { id: info.lastInsertRowid, name, email, password, role: userRole, status };
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
        res.status(201).json({ message: 'User registered successfully', user, token });
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
            const role = userRole || 'Student';
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
        await db.run('DELETE FROM classrooms');
        for (const c of classrooms) {
            await db.run(
                'INSERT INTO classrooms (id, code, section, name, subject, instructor) VALUES (?, ?, ?, ?, ?, ?)',
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
        const rows = await db.all('SELECT * FROM submissions WHERE assignment_id = ?', req.params.assignmentId);
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
        const { studentName, studentId, finalCode, codeHistory } = req.body || {};
        const assignmentId = req.params.assignmentId;
        const name = studentName || studentId || 'Unknown';
        const historyStr = JSON.stringify(Array.isArray(codeHistory) && codeHistory.length > 0 ? codeHistory : [{ time: Date.now(), code: finalCode || '' }]);

        await db.run(
            'DELETE FROM submissions WHERE assignment_id = ? AND (student_name = ? OR student_name = ? OR LOWER(student_name) = LOWER(?))',
            assignmentId, name, studentId || name, name.toLowerCase()
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
            gradesMap[r.student_id] = { grade: r.grade, feedback: r.feedback, gradedAt: r.graded_at };
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
let currentInstruction = "";
const activeStudents = {};

io.on('connection', (socket) => {
    console.log('🟢 Student Workspace Connected: ' + socket.id);

    let activeProcess = null;

    if (currentInstruction) {
        socket.emit('instruction_update', currentInstruction);
    }

    socket.on('teacher_join', ({ classroomId, assignmentId }) => {
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
        currentInstruction = text;
        io.emit('instruction_update', text);
    });

    socket.on('classwork_updated', async ({ classroomId, classwork }) => {
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

    const sessionProjects = new Map();

    socket.on('compile_code', (data) => {
        const { code } = data;
        const sessionId = socket.id.replace(/[^a-zA-Z0-9]/g, '');
        let projectDir = sessionProjects.get(sessionId);
        const isFirstCompile = !projectDir;

        if (!projectDir) {
            projectDir = path.join(os.tmpdir(), `verity_temp_${sessionId}`);
            sessionProjects.set(sessionId, projectDir);
        }

        if (activeProcess) activeProcess.kill();

        if (isFirstCompile) {
            socket.emit('terminal_output', "Initializing compiler environment...\n");

            exec(`dotnet new console -n temp_${sessionId} -o "${projectDir}"`, (newErr) => {
                if (newErr) {
                    sessionProjects.delete(sessionId);
                    return socket.emit('terminal_output', "Error: Could not initialize .NET.\n");
                }
                compileStudentCode(projectDir, code, socket);
            });
        } else {
            compileStudentCode(projectDir, code, socket);
        }
    });

    function compileStudentCode(projectDir, code, socket) {
        fs.writeFileSync(path.join(projectDir, 'Program.cs'), code);
        socket.emit('terminal_output', "Compiling and running...\n\n");

        activeProcess = spawn('dotnet', ['run', '-v', 'q', '-p:WarningLevel=0', '--project', projectDir]);

        let started = false;
        const markStarted = () => {
            if (started) return;
            started = true;
            socket.emit('program_started');
        };

        activeProcess.stdout.on('data', (data) => {
            markStarted();
            socket.emit('terminal_output', data.toString());
        });

        activeProcess.stderr.on('data', (data) => {
            markStarted();
            socket.emit('terminal_output', data.toString());
        });

        activeProcess.on('close', (code) => {
            socket.emit('terminal_output', `\n[Process exited with code ${code}]\n`);
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
        if (data && data.studentId) {
            const classroomId = data.classroomId || 'none';
            const assignmentId = data.assignmentId || 'none';
            const studentKey = `${classroomId}:${assignmentId}:${data.studentId}`;
            if (activeStudents[studentKey]) {
                activeStudents[studentKey] = { ...activeStudents[studentKey], ...data, status: 'Submitted' };
            }

            const roomName = `classroom:${classroomId}:assignment:${assignmentId}`;
            socket.to(roomName).emit('teacher_receive_submission', data);
        }

        const assignmentId = data.assignmentId != null ? String(data.assignmentId) : 'unassigned';

        try {
            await db.run('DELETE FROM submissions WHERE assignment_id = ? AND student_name = ?', assignmentId, data.studentName || 'Unknown');
            const historyStr = JSON.stringify(Array.isArray(data.codeHistory) ? data.codeHistory : []);
            await db.run('INSERT INTO submissions (assignment_id, student_name, history, submittedAt) VALUES (?, ?, ?, ?)', assignmentId, data.studentName || 'Unknown', historyStr, new Date().toISOString());
        } catch (e) { console.error(e); }
    });

    socket.on('unsubmit_exam', async (data) => {
        if (!data) return;
        const assignmentId = data.assignmentId != null ? String(data.assignmentId) : 'unassigned';
        const studentName = data.studentName || data.studentId || 'Unknown';
        const classroomId = data.classroomId || 'none';
        const studentKey = `${classroomId}:${assignmentId}:${data.studentId || studentName}`;

        if (activeStudents[studentKey]) {
            activeStudents[studentKey] = { ...activeStudents[studentKey], status: 'Active' };
        }

        try {
            await db.run(
                'DELETE FROM submissions WHERE assignment_id = ? AND (student_name = ? OR student_name = ? OR LOWER(student_name) = LOWER(?) OR LOWER(student_name) = LOWER(?))',
                assignmentId, studentName, data.studentId || studentName, studentName, data.studentId || studentName
            );
        } catch (e) { console.error(e); }

        const roomName = `classroom:${classroomId}:assignment:${assignmentId}`;
        socket.to(roomName).emit('teacher_student_unsubmitted', { studentName, assignmentId, studentId: data.studentId });
        socket.emit('student_unsubmitted', { studentName, assignmentId, studentId: data.studentId });
        socket.broadcast.emit('student_unsubmitted', { studentName, assignmentId, studentId: data.studentId });
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
        if (activeProcess) activeProcess.kill();
        if (socket.data.studentKey) {
            delete activeStudents[socket.data.studentKey];
            socket.broadcast.emit('teacher_student_left', { studentId: socket.data.studentId });
        }
        const sessionId = socket.id.replace(/[^a-zA-Z0-9]/g, '');
        sessionProjects.delete(sessionId);
        const projectDir = path.join(os.tmpdir(), `verity_temp_${sessionId}`);
        fs.rm(projectDir, { recursive: true, force: true }, () => { });
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
function start(port = 3001) {
    return new Promise((resolve) => {
        server.listen(port, () => {
            console.log(`✅ BACKEND IS ALIVE: http://localhost:${port}`);
            console.log(`📦 Database Provider: ${db.providerName}`);
            resolve(port);
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
    start(3001);
}

module.exports = { start, stop, app };