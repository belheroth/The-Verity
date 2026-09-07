const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const { Server } = require('socket.io');
const http = require('http');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client('985650202101-p4jb6nlaqjeq14v1g2kqldhm7clphkk7.apps.googleusercontent.com');
const db = require('./database.js');

const DATA_DIR = process.env.DATA_DIR || __dirname;

const app = express();
app.use(cors());
// Raised body limit so base64 image/video uploads fit in the request body.
app.use(express.json({ limit: '200mb' }));

// --- FILE UPLOADS (images / videos for assignments) ---
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
// Serve uploaded files statically at http://localhost:3001/uploads/<file>
app.use('/uploads', express.static(UPLOADS_DIR));

// Accepts { filename, dataUrl } (dataUrl = "data:<mime>;base64,<data>"),
// writes the file to /uploads, and returns its public URL.
app.post('/upload', (req, res) => {
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

app.get('/health', (req, res) => {
    try {
        db.prepare('SELECT 1').get();
        res.status(200).json({ 
            status: 'operational', 
            uptime: process.uptime(),
            db: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'error', 
            error: err.message,
            uptime: process.uptime(),
            db: 'error',
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
app.post('/register', (req, res) => {
    const { name, email, password, role } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(400).json({ message: 'Email already exists' });
    }
    const stmt = db.prepare('INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(name, email, password, role || 'Student', 'Active');
    res.status(201).json({ message: 'User registered successfully', user: { id: info.lastInsertRowid, name, email, password, role: role || 'Student' } });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    user.lastLogin = new Date().toISOString();
    user.status = 'Active';
    db.prepare('UPDATE users SET lastLogin = ?, status = ? WHERE id = ?').run(user.lastLogin, user.status, user.id);
    res.status(200).json({ message: 'Login successful', user });
});


app.post('/auth/google', async (req, res) => {
    const { token, role: userRole } = req.body;
    try {
        // NOTE: In production, the client ID must be replaced!
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: '985650202101-p4jb6nlaqjeq14v1g2kqldhm7clphkk7.apps.googleusercontent.com'
        });
        const payload = ticket.getPayload();
        const { email, name } = payload;
        
        let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        
        if (user) {
            user.lastLogin = new Date().toISOString();
            user.status = 'Active';
            db.prepare('UPDATE users SET lastLogin = ?, status = ? WHERE id = ?').run(user.lastLogin, user.status, user.id);
        } else {
            const role = userRole || 'Student';
            const status = 'Active';
            const lastLogin = new Date().toISOString();
            const password = 'google_sso_user'; // dummy password for db constraint
            
            const info = db.prepare('INSERT INTO users (name, email, password, role, lastLogin, status) VALUES (?, ?, ?, ?, ?, ?)').run(name, email, password, role, lastLogin, status);
            
            user = { id: info.lastInsertRowid, name, email, password, role, lastLogin, status };
        }
        
        res.status(200).json({ message: 'Google login successful', user });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Invalid Google token' });
    }
});

// --- ADMIN: USER MANAGEMENT ---
app.get('/users', (req, res) => {
    const users = db.prepare('SELECT id, name, email, role, lastLogin, status FROM users').all().map(u => ({
        ...u,
        status: u.status || 'Active',
        lastLogin: u.lastLogin || null
    }));
    res.status(200).json({ users });
});

app.delete('/users/:email', (req, res) => {
    const email = decodeURIComponent(req.params.email);
    const info = db.prepare('DELETE FROM users WHERE email = ?').run(email);
    if (info.changes === 0) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'User deleted' });
});

// --- CLASSWORK PERSISTENCE ---
app.get('/classwork/:classroomId', (req, res) => {
    const classwork = db.prepare('SELECT * FROM classwork WHERE classroom_id = ?').all(req.params.classroomId);
    res.status(200).json({ classwork });
});

app.put('/classwork/:classroomId', (req, res) => {
    const { classroomId } = req.params;
    const { classwork } = req.body;
    if (!Array.isArray(classwork)) return res.status(400).json({ message: 'classwork must be an array' });
    
    const deleteStmt = db.prepare('DELETE FROM classwork WHERE classroom_id = ?');
    const insertStmt = db.prepare('INSERT INTO classwork (id, classroom_id, title, description, dueDate, type) VALUES (?, ?, ?, ?, ?, ?)');
    
    db.transaction(() => {
        deleteStmt.run(classroomId);
        classwork.forEach(cw => {
            insertStmt.run(cw.id || Date.now(), classroomId, cw.title || '', cw.description || '', cw.dueDate || '', cw.type || '');
        });
    })();
    res.status(200).json({ message: 'Classwork saved' });
});

// --- CLASSROOMS ---
app.get('/classrooms', (req, res) => {
    const classrooms = db.prepare('SELECT * FROM classrooms').all();
    res.status(200).json({ classrooms });
});

app.put('/classrooms', (req, res) => {
    const { classrooms } = req.body;
    if (!Array.isArray(classrooms)) return res.status(400).json({ message: 'classrooms must be an array' });
    
    const deleteStmt = db.prepare('DELETE FROM classrooms');
    const insertStmt = db.prepare('INSERT INTO classrooms (id, code, section, name, subject, instructor) VALUES (?, ?, ?, ?, ?, ?)');
    
    db.transaction(() => {
        deleteStmt.run();
        classrooms.forEach(c => {
            insertStmt.run(c.id || Date.now(), c.code || '', c.section || '', c.name || '', c.subject || '', c.instructor || '');
        });
    })();
    res.status(200).json({ message: 'Classrooms saved' });
});

// --- SUBMISSIONS ---
app.get('/submissions/:assignmentId', (req, res) => {
    const submissions = db.prepare('SELECT * FROM submissions WHERE assignment_id = ?').all(req.params.assignmentId).map(s => {
        return { ...s, history: JSON.parse(s.history), studentName: s.student_name };
    });
    res.status(200).json({ submissions });
});

app.get('/submission-counts', (req, res) => {
    const subs = db.prepare('SELECT assignment_id, COUNT(id) as c FROM submissions GROUP BY assignment_id').all();
    const counts = {};
    subs.forEach(s => counts[s.assignment_id] = s.c);
    const studentCount = db.prepare("SELECT COUNT(id) as c FROM users WHERE role = 'Student'").get().c;
    res.status(200).json({ counts, studentCount });
});

// --- ADMIN DASHBOARD STATS ---
app.get('/stats', (req, res) => {
    const activeUsers = db.prepare("SELECT COUNT(id) as c FROM users WHERE status = 'Active'").get().c;
    const activeClassrooms = db.prepare("SELECT COUNT(id) as c FROM classrooms").get().c;
    const flagRow = db.prepare("SELECT count FROM security_flags WHERE date_string = ?").get(todayKey());
    const securityFlagsToday = flagRow ? flagRow.count : 0;
    res.status(200).json({ activeUsers, activeClassrooms, securityFlagsToday });
});

// --- REAL-TIME C# COMPILER & PROCTORING (The Brain) ---
let currentInstruction = "";
// Latest known state of each connected student, keyed by classroomId:assignmentId:studentId.
// Lets a teacher who opens the live view LATER still see students who already joined.
const activeStudents = {};

io.on('connection', (socket) => {
    console.log('🟢 Student Workspace Connected: ' + socket.id);

    let activeProcess = null;

    // Send the latest instruction to anyone who just connected
    if (currentInstruction) {
        socket.emit('instruction_update', currentInstruction);
    }

    // A teacher opened the live view — send them the current roster snapshot for
    // their classroom/assignment so already-connected students appear immediately.
    // Also join a room so future broadcasts only go to teachers in this classroom/assignment.
    socket.on('teacher_join', ({ classroomId, assignmentId }) => {
        const roomName = `classroom:${classroomId || 'none'}:assignment:${assignmentId || 'none'}`;

        // Leave any previous room this teacher was in
        if (socket.data.teacherRoom) {
            socket.leave(socket.data.teacherRoom);
        }

        // Join the new room
        socket.join(roomName);
        socket.data.teacherRoom = roomName;

        const filterKey = `${classroomId || 'none'}:${assignmentId || 'none'}`;
        for (const [key, student] of Object.entries(activeStudents)) {
            if (key.startsWith(filterKey + ':')) {
                socket.emit('teacher_update_code', student);
            }
        }
    });

    // Teacher sets/updates the instruction; store it and push to all students
    socket.on('set_instruction', (text) => {
        currentInstruction = text;
        io.emit('instruction_update', text);
    });

    // Teacher saved classwork for a classroom — persist it and tell everyone
    // viewing that classroom to refresh their list in real time.
    socket.on('classwork_updated', ({ classroomId, classwork }) => {
        if (classroomId == null || !Array.isArray(classwork)) return;
        
        try {
            const deleteStmt = db.prepare('DELETE FROM classwork WHERE classroom_id = ?');
            const insertStmt = db.prepare('INSERT INTO classwork (id, classroom_id, title, description, dueDate, type) VALUES (?, ?, ?, ?, ?, ?)');
            
            db.transaction(() => {
                deleteStmt.run(classroomId);
                classwork.forEach(cw => {
                    // Skip if archived? If they delete it, it won't be in the list, but if they archive it, 
                    // wait... TeacherClasswork just sends the full array! But our schema doesn't have 'archived'.
                    // For now, just save what they have, but since we don't have 'archived' in SQLite,
                    // we need to either add it or just drop archived ones. 
                    // Actually, TeacherClasswork keeps archived in localStorage. 
                    // Let's just insert all. We might need an 'archived' column, but let's just use description as a JSON if needed,
                    // or just add it to SQLite if it's missing. Wait, let's just add it if it doesn't crash.
                    // Actually, let's just store the whole classwork array as JSON in a new way, or just update the SQLite DB!
                    
                    // The easiest fix for right now without altering schema is just ignore archived flag on backend,
                    // but the frontend uses localStorage anyway! 
                    // Let's just do a basic insert.
                    insertStmt.run(cw.id, classroomId, cw.title || '', cw.description || JSON.stringify({ archived: !!cw.archived, details: cw.details }), cw.dueDate || '', cw.type || '');
                });
            })();
            io.emit('classwork_changed', { classroomId, classwork });
        } catch(e) { console.error(e); }
    });

    socket.on('compile_code', (data) => {
        const { code } = data;
        const sessionId = socket.id.replace(/[^a-zA-Z0-9]/g, '');
        const projectDir = path.join(os.tmpdir(), `verity_temp_${sessionId}`);

        if (activeProcess) activeProcess.kill();

        socket.emit('terminal_output', "Initializing compiler environment...\n");

        exec(`dotnet new console -n temp_${sessionId} -o "${projectDir}"`, (newErr) => {
            if (newErr) {
                return socket.emit('terminal_output', "Error: Could not initialize .NET.\n");
            }

            fs.writeFileSync(path.join(projectDir, 'Program.cs'), code);
            socket.emit('terminal_output', "Compiling and running...\n\n");

            activeProcess = spawn('dotnet', ['run', '-v', 'q', '-p:WarningLevel=0', '--project', projectDir]);

            // The program's first output means compilation is done and it's now
            // actually running — tell the client so it can reveal the input box.
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
                fs.rm(projectDir, { recursive: true, force: true }, () => {});
            });
        });
    });

    socket.on('terminal_input', (input) => {
        if (activeProcess && activeProcess.stdin) {
            activeProcess.stdin.write(input + '\n');
        }
    });

    // Stop a running process on demand
    socket.on('stop_code', () => {
        if (activeProcess) {
            activeProcess.kill();
            socket.emit('terminal_output', "\n[Process stopped by user]\n");
            socket.emit('process_exit');
            activeProcess = null;
        }
    });

    // --- LIVE PROCTORING & MONITORING ---

    // 1. When a student types (or announces on load), broadcast to the teacher
    //    AND remember them so a late-joining teacher still sees them.
    socket.on('student_typing', (data) => {
        if (data && data.studentId) {
            const classroomId = data.classroomId || 'none';
            const assignmentId = data.assignmentId || 'none';
            const studentKey = `${classroomId}:${assignmentId}:${data.studentId}`;
            activeStudents[studentKey] = data;
            socket.data.studentKey = studentKey;
            socket.data.studentId = data.studentId;

            // Broadcast to teachers in the same classroom/assignment room
            const roomName = `classroom:${classroomId}:assignment:${assignmentId}`;
            socket.to(roomName).emit('teacher_update_code', data);
        }
    });

    // 2. When a student triggers an anti-cheat warning
    socket.on('proctor_alert', (data) => {
        if (data && data.studentId) {
            const classroomId = data.classroomId || 'none';
            const assignmentId = data.assignmentId || 'none';
            const studentKey = `${classroomId}:${assignmentId}:${data.studentId}`;
            // Update the student record if it exists
            if (activeStudents[studentKey]) {
                activeStudents[studentKey] = { ...activeStudents[studentKey], ...data };
            }

            // Broadcast to teachers in the same classroom/assignment room
            const roomName = `classroom:${classroomId}:assignment:${assignmentId}`;
            socket.to(roomName).emit('teacher_receive_alert', data);
        }
        // Count it as a security flag for today (drives the Admin dashboard).
        
        try {
            const key = todayKey();
            db.prepare('INSERT INTO security_flags (date_string, count) VALUES (?, 1) ON CONFLICT(date_string) DO UPDATE SET count = count + 1').run(key);
        } catch(e) { console.error(e); }
    });

    // 3. When a student clicks Submit — broadcast live AND persist it so it
    //    survives and can be counted even if no teacher is watching.
    socket.on('submit_exam', (data) => {
        if (data && data.studentId) {
            const classroomId = data.classroomId || 'none';
            const assignmentId = data.assignmentId || 'none';
            const studentKey = `${classroomId}:${assignmentId}:${data.studentId}`;
            // Update the student record if it exists
            if (activeStudents[studentKey]) {
                activeStudents[studentKey] = { ...activeStudents[studentKey], ...data, status: 'Submitted' };
            }

            // Broadcast to teachers in the same classroom/assignment room
            const roomName = `classroom:${classroomId}:assignment:${assignmentId}`;
            socket.to(roomName).emit('teacher_receive_submission', data);
        }

        const assignmentId = data.assignmentId != null ? String(data.assignmentId) : 'unassigned';
        
        try {
            const deleteStmt = db.prepare('DELETE FROM submissions WHERE assignment_id = ? AND student_name = ?');
            const insertStmt = db.prepare('INSERT INTO submissions (assignment_id, student_name, history, submittedAt) VALUES (?, ?, ?, ?)');
            
            db.transaction(() => {
                deleteStmt.run(assignmentId, data.studentName || 'Unknown');
                const historyStr = JSON.stringify(Array.isArray(data.codeHistory) ? data.codeHistory : []);
                insertStmt.run(assignmentId, data.studentName || 'Unknown', historyStr, new Date().toISOString());
            })();
        } catch(e) { console.error(e); }
    });

    // 4. When a student's terminal updates, forward it to teachers in the same classroom/assignment!
    socket.on('student_terminal_update', (data) => {
        socket.broadcast.emit('teacher_terminal_update', data);
    });

    socket.on('disconnect', () => {
        if (activeProcess) activeProcess.kill();
        // Drop this student from the roster and tell teachers they left.
        if (socket.data.studentKey) {
            delete activeStudents[socket.data.studentKey];
            socket.broadcast.emit('teacher_student_left', { studentId: socket.data.studentId });
        }
        const sessionId = socket.id.replace(/[^a-zA-Z0-9]/g, '');
        const projectDir = path.join(os.tmpdir(), `verity_temp_${sessionId}`);
        fs.rm(projectDir, { recursive: true, force: true }, () => {});
    });
});

// START SERVER (deferred when loaded from Electron; auto-start when run directly)
function start(port = 3001) {
    return new Promise((resolve) => {
        server.listen(port, () => {
            console.log(`✅ BACKEND IS ALIVE: http://localhost:${port}`);
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