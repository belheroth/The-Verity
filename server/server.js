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
// 150mb limit allows video uploads (mp4, webm, mov) with base64 overhead
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

// --- SECURITY: BLOCK SEARCH ENGINE CRAWLERS & INDEXING ---
app.use((req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    next();
});

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /\n');
});

// --- SECURITY: ADMIN IP WHITELISTING & RATE LIMITING ---
const adminLoginAttempts = new Map();

const isIpWhitelisted = (ip) => {
    if (!ip) return true;
    const cleanIp = ip.replace(/^.*:/, ''); // strip IPv6 prefix if mapped
    const allowedEnv = (process.env.ADMIN_ALLOWED_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
    const defaultAllowed = ['127.0.0.1', '::1', 'localhost', '192.168.8.115', '131.226.102.72'];
    if (defaultAllowed.includes(cleanIp) || allowedEnv.includes(cleanIp) || allowedEnv.includes('*')) {
        return true;
    }
    return false;
};

const adminIpWhitelist = (req, res, next) => {
    // In Vercel/proxy environments, the real IP is in headers.
    let clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || req.connection?.remoteAddress;
    
    // x-forwarded-for can be a comma-separated list of IPs. The first one is the client.
    if (typeof clientIp === 'string' && clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
    }

    if (!isIpWhitelisted(clientIp)) {
        console.warn(`[SECURITY ALERT] Admin access blocked for non-whitelisted IP: ${clientIp}`);
        return res.status(403).json({ message: `Access denied, your not eligible for admin access` });
    }
    next();
};

const adminLoginRateLimiter = (req, res, next) => {
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 mins window
    const maxAttempts = 5;

    const record = adminLoginAttempts.get(clientIp) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + windowMs;
    }

    if (record.count >= maxAttempts) {
        const remainingMinutes = Math.ceil((record.resetTime - now) / 60000);
        return res.status(429).json({ 
            message: `Too many failed admin login attempts. Account locked for ${remainingMinutes} minute(s).` 
        });
    }

    req.adminRateRecord = record;
    req.clientIp = clientIp;
    next();
};

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
    '.mp4', '.webm', '.ogg', '.mov', '.quicktime', '.m4v',
    '.pdf', '.zip', '.txt'
]);

// Serve uploaded files statically at /uploads/<file> with security and media streaming headers
app.use('/uploads', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'bytes');
    next();
}, express.static(UPLOADS_DIR, {
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.mov') {
            res.setHeader('Content-Type', 'video/quicktime');
        } else if (ext === '.mp4') {
            res.setHeader('Content-Type', 'video/mp4');
        } else if (ext === '.webm') {
            res.setHeader('Content-Type', 'video/webm');
        }
    }
}));

// Raw binary upload endpoint (ideal for large videos like MP4, WebM, MOV without base64 overhead)
app.post('/upload-raw', (req, res) => {
    const rawFilename = req.query.filename || req.headers['x-filename'] || 'file.mp4';
    const ext = path.extname(rawFilename).toLowerCase();
    if (!ALLOWED_UPLOAD_EXTS.has(ext)) {
        return res.status(400).json({ 
            message: `File type "${ext || 'unknown'}" is not allowed. Supported formats: images (.png, .jpg, .gif, .webp), videos (.mp4, .webm, .mov), pdf, zip, txt.` 
        });
    }

    const safeName = (rawFilename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const unique = `${Date.now()}_${safeName}`;
    const targetPath = path.join(UPLOADS_DIR, unique);
    const writeStream = fs.createWriteStream(targetPath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
        const host = req.get('host');
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        res.status(201).json({ url: `${protocol}://${host}/uploads/${unique}` });
    });

    writeStream.on('error', (err) => {
        console.error('Upload stream error:', err);
        res.status(500).json({ message: 'Failed to write upload stream' });
    });
});

// Accepts { filename, dataUrl } (dataUrl = "data:<mime>;base64,<data>"),
// writes the file to /uploads, and returns its public URL.
app.post('/upload', (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        authenticateToken(req, res, () => next());
    } else {
        next();
    }
}, (req, res) => {
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
            message: `File type "${ext || 'unknown'}" is not allowed. Supported formats: images (.png, .jpg, .gif, .webp), videos (.mp4, .webm, .mov), pdf, zip, txt.` 
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

// --- MAINTENANCE MODE HELPER ---
const getMaintenanceStatus = async () => {
    try {
        const row = await db.get("SELECT value FROM system_settings WHERE key = 'global_config'");
        if (row && row.value) {
            const config = JSON.parse(row.value);
            if (config.general && config.general.maintenanceMode) {
                return {
                    enabled: true,
                    message: config.general.offlineMessage || 'The system is currently undergoing maintenance. Please try again later.',
                };
            }
        }
    } catch (_) {}
    return { enabled: false, message: '' };
};

// Public endpoint: allows login page to check maintenance status without auth
app.get('/maintenance-status', async (req, res) => {
    const status = await getMaintenanceStatus();
    res.status(200).json(status);
});

// --- AUTHENTICATION ROUTES ---
app.post('/register', async (req, res) => {
    try {
        // Block registration during maintenance mode (unless requester is admin)
        const maintenance = await getMaintenanceStatus();
        if (maintenance.enabled) {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            let isAdmin = false;
            if (token) {
                try { const d = jwt.verify(token, JWT_SECRET); if (d && d.role === 'Admin') isAdmin = true; } catch (_) {}
            }
            if (!isAdmin) {
                return res.status(503).json({ message: maintenance.message, maintenance: true });
            }
        }

        const { name, email, password, role } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanName = (name || '').trim().toLowerCase();

        // 1. Check if email already exists in users or admin_users
        const existingUserEmail = await db.get('SELECT id FROM users WHERE LOWER(email) = ?', cleanEmail);
        const existingAdminEmail = await db.get('SELECT id FROM admin_users WHERE LOWER(email) = ?', cleanEmail);
        if (existingUserEmail || existingAdminEmail) {
            return res.status(400).json({ message: 'invalid email' });
        }

        // 2. Check if username (name) already exists in users or admin_users
        const existingUserName = await db.get('SELECT id FROM users WHERE LOWER(name) = ?', cleanName);
        const existingAdminName = await db.get('SELECT id FROM admin_users WHERE LOWER(name) = ?', cleanName);
        if (existingUserName || existingAdminName) {
            return res.status(400).json({ message: 'invalid email' });
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
        const userToken = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
        res.status(201).json({ message: 'User registered successfully', user, token: userToken });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        // Block student/teacher login during maintenance mode
        const maintenance = await getMaintenanceStatus();
        if (maintenance.enabled) {
            return res.status(503).json({ message: maintenance.message, maintenance: true });
        }

        const { email, password } = req.body;
        const cleanEmail = (email || '').trim().toLowerCase();

        // 1. STRICT ISOLATION: Reject any admin account attempting standard login with generic error
        const isAdminAcc = await db.get('SELECT id FROM admin_users WHERE LOWER(email) = ?', cleanEmail);
        if (isAdminAcc) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Standard login queries users table (Teachers & Students) ONLY
        const user = await db.get('SELECT * FROM users WHERE LOWER(email) = ? AND password = ?', cleanEmail, password);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.role === 'Admin' || user.role === 'admin') {
            try { await db.run('DELETE FROM users WHERE id = ?', user.id); } catch (_) {}
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (user.status === 'Pending') {
            return res.status(403).json({ message: 'Your account is pending admin approval' });
        }
        user.lastLogin = new Date().toISOString();
        await db.run('UPDATE users SET lastLogin = ? WHERE id = ?', user.lastLogin, user.id);
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
        res.status(200).json({ message: 'Login successful', user, token });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- ADMIN ISOLATED AUTH & PROFILE ENDPOINTS ---
app.post('/admin/login', adminIpWhitelist, adminLoginRateLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const adminUser = await db.get('SELECT * FROM admin_users WHERE LOWER(email) = ? AND password = ?', cleanEmail, password);

        if (!adminUser) {
            if (req.adminRateRecord) {
                req.adminRateRecord.count += 1;
                adminLoginAttempts.set(req.clientIp, req.adminRateRecord);
            }
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        if (adminUser.status === 'Suspended') {
            return res.status(403).json({ message: 'Admin account is suspended' });
        }

        // Reset rate limiter on successful login
        if (req.clientIp) adminLoginAttempts.delete(req.clientIp);

        adminUser.lastLogin = new Date().toISOString();
        await db.run('UPDATE admin_users SET lastLogin = ? WHERE id = ?', adminUser.lastLogin, adminUser.id);

        const token = jwt.sign(
            { id: adminUser.id, email: adminUser.email, role: 'Admin', name: adminUser.name, isAdmin: true },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const adminObj = {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            role: 'Admin',
            status: adminUser.status || 'Active',
            lastLogin: adminUser.lastLogin,
            avatar: adminUser.avatar || null
        };

        res.status(200).json({ message: 'Admin login successful', user: adminObj, token });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.get('/admin/profile', authenticateToken, adminIpWhitelist, requireRole('Admin'), async (req, res) => {
    try {
        const adminUser = await db.get('SELECT id, name, email, role, avatar, status, lastLogin FROM admin_users WHERE id = ?', req.user.id);
        if (!adminUser) return res.status(404).json({ message: 'Admin profile not found' });
        res.status(200).json({ user: adminUser });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/auth/google', async (req, res) => {
    const { token, role: userRole } = req.body;
    try {
        // Block Google SSO login during maintenance mode
        const maintenance = await getMaintenanceStatus();
        if (maintenance.enabled) {
            return res.status(503).json({ message: maintenance.message, maintenance: true });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: '985650202101-p4jb6nlaqjeq14v1g2kqldhm7clphkk7.apps.googleusercontent.com'
        });
        const payload = ticket.getPayload();
        const { email, name } = payload;
        const cleanEmail = (email || '').trim().toLowerCase();

        const isAdminAcc = await db.get('SELECT id FROM admin_users WHERE LOWER(email) = ?', cleanEmail);
        if (isAdminAcc) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        let user = await db.get('SELECT * FROM users WHERE LOWER(email) = ?', cleanEmail);

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

        res.status(200).json({ message: 'Google login successful', user, token: jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET) });
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

app.put('/users/:email', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const targetEmail = decodeURIComponent(req.params.email).toLowerCase();
        const { name, email, role, status, password } = req.body || {};

        const existing = await db.get('SELECT * FROM users WHERE LOWER(email) = ?', targetEmail);
        if (!existing) return res.status(404).json({ message: 'User not found' });

        const newName = name && name.trim() ? name.trim() : existing.name;
        const newEmail = email && email.trim() ? email.trim().toLowerCase() : existing.email;
        const newRole = role || existing.role;
        const newStatus = status || existing.status || 'Active';

        if (newEmail !== existing.email.toLowerCase()) {
            const conflict = await db.get('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?', newEmail, existing.id);
            if (conflict) return res.status(400).json({ message: 'Email is already in use by another user' });
        }

        if (password && password.trim()) {
            await db.run(
                'UPDATE users SET name = ?, email = ?, role = ?, status = ?, password = ? WHERE id = ?',
                newName, newEmail, newRole, newStatus, password.trim(), existing.id
            );
        } else {
            await db.run(
                'UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?',
                newName, newEmail, newRole, newStatus, existing.id
            );
        }

        if (existing.role === 'Teacher') {
            await db.run(
                'UPDATE classrooms SET instructor = ?, instructor_email = ? WHERE LOWER(instructor_email) = ? OR instructor = ?',
                newName, newEmail, existing.email.toLowerCase(), existing.name
            );
        }

        const updatedUser = await db.get('SELECT id, name, email, role, status, lastLogin FROM users WHERE id = ?', existing.id);
        res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- USER PROFILE ENDPOINTS ---
app.get('/users/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await db.get('SELECT id, name, email, role, avatar, status FROM users WHERE id = ?', userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ user });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.put('/users/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email, avatar } = req.body || {};
        const userId = req.user.id;
        const current = await db.get('SELECT * FROM users WHERE id = ?', userId);
        if (!current) return res.status(404).json({ message: 'User not found' });

        const updatedName = name && name.trim() ? name.trim() : current.name;
        const updatedEmail = email && email.trim() ? email.trim().toLowerCase() : current.email;
        const updatedAvatar = avatar !== undefined ? avatar : current.avatar;

        await db.run(
            'UPDATE users SET name = ?, email = ?, avatar = ? WHERE id = ?',
            updatedName, updatedEmail, updatedAvatar, userId
        );

        // If teacher, keep their classrooms updated with their real name and email
        if (current.role === 'Teacher') {
            await db.run(
                'UPDATE classrooms SET instructor = ?, instructor_email = ? WHERE LOWER(instructor_email) = LOWER(?) OR instructor = ?',
                updatedName, updatedEmail, current.email, current.name
            ).catch(() => {});
        }

        // If admin, also update the admin_users table so the avatar persists for admins
        if (current.role === 'Admin') {
            await db.run(
                'UPDATE admin_users SET name = ?, email = ?, avatar = ? WHERE id = ?',
                updatedName, updatedEmail, updatedAvatar, userId
            ).catch(() => {});
        }

        const user = {
            id: userId,
            name: updatedName,
            email: updatedEmail,
            role: current.role,
            avatar: updatedAvatar,
            status: current.status
        };

        // Broadcast avatar update so others and all active sessions update in real time
        io.emit('user_avatar_updated', {
            userId,
            name: updatedName,
            email: updatedEmail,
            avatar: updatedAvatar,
            role: current.role
        });

        if (current.role === 'Teacher') {
            io.emit('classrooms_updated');
        }

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- CLASSWORK PERSISTENCE HELPERS ---
const getClassworkFromDb = async (classroomId) => {
    const rows = (classroomId && classroomId !== 'all')
        ? await db.all('SELECT * FROM classwork WHERE classroom_id = ? ORDER BY id DESC', classroomId)
        : await db.all('SELECT * FROM classwork ORDER BY id DESC');
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
app.get('/classwork', authenticateToken, async (req, res) => {
    try {
        const classwork = await getClassworkFromDb();
        res.status(200).json({ classwork });
    } catch (e) {
        console.error('Error fetching all classwork:', e);
        res.status(500).json({ classwork: [] });
    }
});

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
        let rawClassrooms = [];
        if (req.user?.role === 'Student') {
            const studentEmail = (req.user.email || '').trim().toLowerCase();
            const studentId = req.user.id || 0;
            rawClassrooms = await db.all(`
                SELECT DISTINCT c.* FROM classrooms c
                INNER JOIN enrollments e ON e.classroom_id = c.id
                WHERE (e.student_email IS NOT NULL AND LOWER(e.student_email) = ?)
                   OR (e.student_id IS NOT NULL AND e.student_id = ?)
                ORDER BY c.id ASC
            `, studentEmail, studentId);
        } else if (req.user?.role === 'Teacher') {
            const teacherEmail = (req.user.email || '').trim().toLowerCase();
            const teacherName = (req.user.name || '').trim().toLowerCase();
            rawClassrooms = await db.all(`
                SELECT * FROM classrooms
                WHERE (instructor_email IS NOT NULL AND LOWER(instructor_email) = ?)
                   OR (instructor IS NOT NULL AND LOWER(instructor) = ?)
                ORDER BY id ASC
            `, teacherEmail, teacherName);
        } else {
            // Admin can view all classrooms
            rawClassrooms = await db.all('SELECT * FROM classrooms ORDER BY id ASC');
        }

        // Filter out phantom/dummy classrooms with no valid section/subject
        const validClassrooms = rawClassrooms.filter(c => {
            if (!c || !c.name) return false;
            const isPhantom = /^Classroom \d+$/i.test(c.name.trim()) && (!c.section || !c.section.trim()) && (!c.subject || !c.subject.trim());
            return !isPhantom;
        });

        const formatted = await Promise.all(validClassrooms.map(async c => {
            let instName = (c.instructor && c.instructor.trim()) || '';
            let instEmail = (c.instructor_email && c.instructor_email.trim()) || (c.instructorEmail && c.instructorEmail.trim()) || '';

            let realTeacher = null;
            if (instEmail) {
                realTeacher = await db.get("SELECT id, name, email, avatar, role FROM users WHERE LOWER(email) = LOWER(?) AND (LOWER(role) = 'teacher' OR LOWER(role) = 'admin')", instEmail).catch(() => null);
                if (!realTeacher) realTeacher = await db.get("SELECT id, name, email, avatar, role FROM admin_users WHERE LOWER(email) = LOWER(?)", instEmail).catch(() => null);
            }
            if (!realTeacher && instName && instName !== 'Instructor') {
                realTeacher = await db.get("SELECT id, name, email, avatar, role FROM users WHERE LOWER(name) = LOWER(?) AND (LOWER(role) = 'teacher' OR LOWER(role) = 'admin')", instName).catch(() => null);
                if (!realTeacher) realTeacher = await db.get("SELECT id, name, email, avatar, role FROM admin_users WHERE LOWER(name) = LOWER(?)", instName).catch(() => null);
            }

            if (realTeacher) {
                instName = realTeacher.name;
                instEmail = realTeacher.email;
            }

            let parsedTheme = null;
            if (c.theme) {
                try {
                    parsedTheme = typeof c.theme === 'string' ? JSON.parse(c.theme) : c.theme;
                } catch {
                    parsedTheme = null;
                }
            }

            return {
                ...c,
                theme: parsedTheme,
                instructor: instName || 'Instructor',
                instructorEmail: instEmail,
                instructorAvatar: realTeacher?.avatar || null
            };
        }));
        res.status(200).json({ classrooms: formatted });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.put('/classrooms', authenticateToken, requireRole('Teacher', 'Admin'), async (req, res) => {
    const { classrooms } = req.body;
    if (!Array.isArray(classrooms)) return res.status(400).json({ message: 'classrooms must be an array' });

    try {
        const assignedInBatch = new Set();
        const savedClassrooms = [];

        for (const c of classrooms) {
            // Ignore phantom classrooms
            if (c.name && /^Classroom \d+$/i.test(c.name.trim()) && (!c.section || !c.section.trim()) && (!c.subject || !c.subject.trim())) {
                continue;
            }
            const instName = c.instructor || req.user.name || 'Instructor';
            const instEmail = c.instructorEmail || c.instructor_email || (req.user.role === 'Teacher' ? req.user.email : '');
            const themeStr = c.theme ? (typeof c.theme === 'object' ? JSON.stringify(c.theme) : c.theme) : null;
            const classroomId = c.id || Date.now();

            // Auto-generate or validate unique class code
            let classCode = (c.code || '').toString().trim().toLowerCase();

            // If no code provided in payload, check if this classroom already has one in DB
            if (!classCode) {
                const existingDbClassroom = await db.get('SELECT id, code FROM classrooms WHERE id = ?', classroomId);
                if (existingDbClassroom?.code) {
                    classCode = existingDbClassroom.code.trim().toLowerCase();
                }
            }

            // Check if code is already taken by another classroom or already assigned in this batch
            let codeConflict = false;
            if (classCode) {
                if (assignedInBatch.has(classCode)) {
                    codeConflict = true;
                } else {
                    const row = await db.get('SELECT id FROM classrooms WHERE LOWER(code) = ? AND id != ?', classCode, classroomId);
                    if (row) codeConflict = true;
                }
            }

            // If empty or conflicted, generate a guaranteed unique code
            if (!classCode || codeConflict) {
                let attempts = 0;
                do {
                    classCode = db.generateClassCodeSync ? db.generateClassCodeSync(assignedInBatch) : ('v' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5)).slice(0, 7);
                    const conflict = await db.get('SELECT id FROM classrooms WHERE LOWER(code) = ? AND id != ?', classCode, classroomId);
                    if (!conflict) break;
                    attempts++;
                } while (attempts < 50);
            }

            assignedInBatch.add(classCode);

            await db.run(`
                INSERT INTO classrooms (id, code, section, name, subject, instructor, instructor_email, theme) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    code = excluded.code,
                    section = excluded.section,
                    name = excluded.name,
                    subject = excluded.subject,
                    instructor = excluded.instructor,
                    instructor_email = excluded.instructor_email,
                    theme = COALESCE(excluded.theme, classrooms.theme)
            `,
                classroomId, classCode, c.section || '', c.name || '', c.subject || '', instName, instEmail, themeStr
            );

            savedClassrooms.push({
                ...c,
                id: classroomId,
                code: classCode,
                instructor: instName,
                instructorEmail: instEmail
            });
        }
        res.status(200).json({ message: 'Classrooms saved', classrooms: savedClassrooms });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.patch('/classrooms/:id/theme', authenticateToken, requireRole('Teacher', 'Admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { theme } = req.body;
        if (!theme) return res.status(400).json({ message: 'Theme is required' });

        const themeStr = typeof theme === 'object' ? JSON.stringify(theme) : theme;
        await db.run('UPDATE classrooms SET theme = ? WHERE id = ?', themeStr, id);

        const classroom = await db.get('SELECT * FROM classrooms WHERE id = ?', id);
        const detailPayload = {
            classroomId: id,
            code: classroom?.code || classroom?.section,
            name: classroom?.name,
            theme: typeof theme === 'string' ? JSON.parse(theme) : theme
        };

        io.emit('classroom_theme_changed', detailPayload);
        res.status(200).json({ message: 'Theme updated successfully', theme: detailPayload.theme });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.delete('/classrooms/:id', authenticateToken, requireRole('Teacher', 'Admin'), async (req, res) => {
    try {
        const id = req.params.id;
        await db.run('DELETE FROM submissions WHERE assignment_id IN (SELECT id FROM classwork WHERE classroom_id = ?)', id).catch(() => {});
        await db.run('DELETE FROM grades WHERE assignment_id IN (SELECT id FROM classwork WHERE classroom_id = ?)', id).catch(() => {});
        await db.run('DELETE FROM classwork WHERE classroom_id = ?', id).catch(() => {});
        await db.run('DELETE FROM enrollments WHERE classroom_id = ?', id).catch(() => {});
        await db.run('DELETE FROM classrooms WHERE id = ?', id);
        res.status(200).json({ message: 'Classroom deleted successfully' });
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
        const classroom = await db.get('SELECT * FROM classrooms WHERE id = ?', classroomId);

        let instructor = null;
        let instUser = null;

        if (classroom) {
            if (classroom.instructor_email && classroom.instructor_email.trim()) {
                instUser = await db.get("SELECT id, name, email, avatar, role FROM users WHERE LOWER(email) = LOWER(?) AND (LOWER(role) = 'teacher' OR LOWER(role) = 'admin')", classroom.instructor_email.trim());
                if (!instUser) instUser = await db.get("SELECT id, name, email, avatar, role FROM admin_users WHERE LOWER(email) = LOWER(?)", classroom.instructor_email.trim());
            }
            if (!instUser && classroom.instructor && classroom.instructor.trim() && classroom.instructor !== 'Instructor') {
                instUser = await db.get("SELECT id, name, email, avatar, role FROM users WHERE LOWER(name) = LOWER(?) AND (LOWER(role) = 'teacher' OR LOWER(role) = 'admin')", classroom.instructor.trim());
                if (!instUser) instUser = await db.get("SELECT id, name, email, avatar, role FROM admin_users WHERE LOWER(name) = LOWER(?)", classroom.instructor.trim());
            }
        }

        if (instUser) {
            instructor = {
                id: instUser.id,
                name: instUser.name,
                email: instUser.email,
                avatar: instUser.avatar || null,
                role: instUser.role
            };
        } else {
            instructor = {
                id: null,
                name: classroom?.instructor || 'Instructor',
                email: classroom?.instructor_email || '',
                avatar: null
            };
        }

        // 1. Students who explicitly enrolled in this classroom (with real account avatar & name)
        const enrolledRows = await db.all(`
            SELECT DISTINCT 
                u.id as user_id,
                COALESCE(u.name, e.student_name) as name, 
                COALESCE(u.email, e.student_email) as email,
                u.avatar
            FROM enrollments e
            LEFT JOIN users u ON (LOWER(u.email) = LOWER(e.student_email) OR u.id = e.student_id)
            WHERE e.classroom_id = ?
        `, classroomId).catch(() => []);

        // 2. Students who submitted assignments for this classroom
        const subRows = await db.all(`
            SELECT DISTINCT 
                u.id as user_id,
                COALESCE(u.name, s.student_name) as name, 
                COALESCE(u.email, s.student_name) as email,
                u.avatar
            FROM submissions s
            JOIN classwork c ON s.assignment_id = c.id
            LEFT JOIN users u ON (LOWER(u.name) = LOWER(s.student_name) OR LOWER(u.email) = LOWER(s.student_name))
            WHERE c.classroom_id = ?
        `, classroomId).catch(() => []);

        const studentsMap = {};
        for (const s of [...enrolledRows, ...subRows]) {
            if (s && s.name && s.name.trim()) {
                const key = s.name.trim().toLowerCase();
                // Never show teacher or admin in the student/classmate roster
                if (instructor && (
                    (instructor.name && key === instructor.name.toLowerCase()) ||
                    (instructor.email && s.email && s.email.toLowerCase() === instructor.email.toLowerCase())
                )) {
                    continue;
                }
                if (!studentsMap[key]) {
                    studentsMap[key] = {
                        id: s.user_id || null,
                        name: s.name.trim(),
                        email: s.email && s.email.includes('@') ? s.email : `${s.name.trim().toLowerCase().replace(/\s+/g, '.')}@student.verity.edu`,
                        avatar: s.avatar || null
                    };
                }
            }
        }

        res.status(200).json({ 
            students: Object.values(studentsMap),
            instructor
        });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/classrooms/:classroomId/enroll', authenticateToken, async (req, res) => {
    try {
        const { classroomId } = req.params;
        const now = new Date().toISOString();

        // Support array of students or single student
        const incomingStudents = Array.isArray(req.body?.students)
            ? req.body.students
            : [{
                name: req.body?.studentName || req.user.name,
                email: req.body?.studentEmail || req.user.email,
                id: req.body?.studentId || (req.body?.studentName ? null : req.user.id)
            }];

        const enrolledList = [];

        for (const st of incomingStudents) {
            const studentName = (st.name || st.studentName || '').trim();
            const studentEmail = (st.email || st.studentEmail || '').trim().toLowerCase();
            const studentId = st.id || st.studentId || null;

            if (!studentName || !studentEmail) continue;

            await db.run(`
                INSERT INTO enrollments (classroom_id, student_id, student_name, student_email, enrolled_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(classroom_id, student_email) DO UPDATE SET
                    student_name = excluded.student_name,
                    enrolled_at = excluded.enrolled_at
            `, classroomId, studentId, studentName, studentEmail, now);

            enrolledList.push({ name: studentName, email: studentEmail, id: studentId });
        }

        io.emit('classroom_students_changed', { classroomId });

        res.status(200).json({ message: 'Enrolled successfully', enrolledCount: enrolledList.length, students: enrolledList });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/classrooms/join', authenticateToken, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ message: 'Class code required' });

        const trimmed = code.trim().toLowerCase();
        let classroom = await db.get(`
            SELECT * FROM classrooms 
            WHERE LOWER(code) = ?
        `, trimmed);

        if (!classroom) {
            classroom = await db.get(`
                SELECT * FROM classrooms 
                WHERE LOWER(section) = ? OR LOWER(name) = ? OR CAST(id as TEXT) = ?
            `, trimmed, trimmed, trimmed);
        }

        if (!classroom) {
            return res.status(404).json({ message: 'No class found with that code' });
        }

        const studentName = req.body?.studentName || req.user?.name || (req.user?.email ? req.user.email.split('@')[0] : 'Student');
        const studentEmail = (req.body?.studentEmail || req.user?.email || '').trim().toLowerCase();
        const studentId = req.user?.id || null;
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO enrollments (classroom_id, student_id, student_name, student_email, enrolled_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(classroom_id, student_email) DO UPDATE SET
                student_name = excluded.student_name,
                enrolled_at = excluded.enrolled_at
        `, classroom.id, studentId, studentName, studentEmail, now);

        let parsedTheme = null;
        if (classroom.theme) {
            try {
                parsedTheme = typeof classroom.theme === 'string' ? JSON.parse(classroom.theme) : classroom.theme;
            } catch {}
        }

        let instName = (classroom.instructor && classroom.instructor.trim()) || '';
        let instEmail = (classroom.instructor_email && classroom.instructor_email.trim()) || '';
        let realTeacher = null;
        if (instEmail) {
            realTeacher = await db.get("SELECT id, name, email, avatar, role FROM users WHERE LOWER(email) = LOWER(?) AND (LOWER(role) = 'teacher' OR LOWER(role) = 'admin')", instEmail).catch(() => null);
            if (!realTeacher) realTeacher = await db.get("SELECT id, name, email, avatar, role FROM admin_users WHERE LOWER(email) = LOWER(?)", instEmail).catch(() => null);
        }
        if (!realTeacher && instName && instName !== 'Instructor') {
            realTeacher = await db.get("SELECT id, name, email, avatar, role FROM users WHERE LOWER(name) = LOWER(?) AND (LOWER(role) = 'teacher' OR LOWER(role) = 'admin')", instName).catch(() => null);
            if (!realTeacher) realTeacher = await db.get("SELECT id, name, email, avatar, role FROM admin_users WHERE LOWER(name) = LOWER(?)", instName).catch(() => null);
        }
        if (realTeacher) {
            instName = realTeacher.name;
            instEmail = realTeacher.email;
        }

        res.status(200).json({ 
            classroom: {
                ...classroom,
                theme: parsedTheme,
                instructor: instName || 'Instructor',
                instructorEmail: instEmail,
                instructorAvatar: realTeacher?.avatar || null
            }, 
            message: 'Enrolled successfully' 
        });
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

    socket.on('classroom_theme_updated', async (data) => {
        if (!data) return;
        const { classroomId, theme } = data;
        if (classroomId && theme) {
            try {
                const themeStr = typeof theme === 'object' ? JSON.stringify(theme) : theme;
                await db.run('UPDATE classrooms SET theme = ? WHERE id = ?', themeStr, classroomId);
            } catch (e) {
                console.error('Error persisting classroom theme via socket:', e);
            }
        }
        io.emit('classroom_theme_changed', data);
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
        socket.emit('terminal_output', "Compiling...\n");
        socket.emit('compiler_diagnostics', []); // Clear existing markers

        const projectFile = path.join(projectDir, 'verity_base.csproj');
        const targetFramework = getDotnetTargetFramework();
        const dllPath = path.join(projectDir, 'bin', 'Debug', targetFramework, 'verity_base.dll');
        const treatWarningsAsErrors = await getTreatWarningsAsErrors();

        const buildArgs = [
            'build',
            '-v', 'q',
            '-clp:NoSummary',
            '--disable-build-servers',
            treatWarningsAsErrors ? '-p:WarningLevel=4' : '-p:WarningLevel=0',
            ...(treatWarningsAsErrors ? ['-p:TreatWarningsAsErrors=true'] : []),
            projectFile
        ];

        const env = {
            ...process.env,
            DOTNET_CLI_TELEMETRY_OPTOUT: '1',
            DOTNET_NOLOGO: '1',
            DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1',
            DOTNET_CLI_UI_LANGUAGE: 'en-US',
            MSBUILDDISABLENODEREUSE: '1'
        };

        // Stage 1: Fast compilation via dotnet build
        const buildProcess = spawn('dotnet', buildArgs, { cwd: projectDir, env });
        activeProcess = buildProcess;

        let rawCompilerOutput = '';
        buildProcess.stdout.on('data', (d) => { rawCompilerOutput += d.toString(); });
        buildProcess.stderr.on('data', (d) => { rawCompilerOutput += d.toString(); });

        const buildTimeout = setTimeout(() => {
            if (activeProcess === buildProcess) {
                try { buildProcess.kill(); } catch (_) {}
                socket.emit('terminal_output', "\n[Compilation timed out]\n");
                socket.emit('process_exit');
                activeProcess = null;
            }
        }, 15000);

        buildProcess.on('error', (err) => {
            clearTimeout(buildTimeout);
            socket.emit('terminal_output', `\n[Compiler launch error: ${err.message}]\n`);
            socket.emit('process_exit');
            activeProcess = null;
        });

        buildProcess.on('close', (buildCode) => {
            clearTimeout(buildTimeout);
            if (activeProcess !== buildProcess) return;

            const diagnostics = parseCompilerDiagnostics(rawCompilerOutput);
            socket.emit('compiler_diagnostics', diagnostics);

            if (buildCode !== 0 || !fs.existsSync(dllPath)) {
                socket.emit('terminal_output', rawCompilerOutput + "\n[Build failed. Fix the build errors and run again.]\n");
                socket.emit('process_exit');
                activeProcess = null;
                return;
            }

            // Stage 2: Direct .dll execution (sub-100ms startup, zero MSBuild wrapper overhead)
            socket.emit('terminal_output', "Running...\n\n");
            socket.emit('program_started');

            const runProcess = spawn('dotnet', [dllPath], { cwd: projectDir, env });
            activeProcess = runProcess;

            const executionTimeout = setTimeout(() => {
                if (activeProcess === runProcess) {
                    try { runProcess.kill(); } catch (_) {}
                    socket.emit('terminal_output', "\n[Process terminated: Execution limit of 20s exceeded]\n");
                    socket.emit('process_exit');
                    activeProcess = null;
                }
            }, 20000);

            runProcess.on('error', (err) => {
                clearTimeout(executionTimeout);
                socket.emit('terminal_output', `\n[Execution error: ${err.message}]\n`);
                socket.emit('process_exit');
                activeProcess = null;
            });

            runProcess.stdout.on('data', (data) => {
                socket.emit('terminal_output', data.toString());
            });

            runProcess.stderr.on('data', (data) => {
                socket.emit('terminal_output', data.toString());
            });

            runProcess.on('close', (runCode) => {
                clearTimeout(executionTimeout);
                socket.emit('terminal_output', `\n[Process exited with code ${runCode ?? 0}]\n`);
                socket.emit('process_exit');
                activeProcess = null;
            });
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

const handleSaveSettings = async (req, res) => {
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
        const userName = req.user?.email || req.user?.name || 'unknown';
        await db.run('INSERT INTO audit_logs ("user", type, severity, "desc") VALUES (?, ?, ?, ?)', userName, 'System Settings Updated', 'Normal', 'Admin updated system settings via API');
        res.status(200).json({ message: 'Settings saved successfully' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

app.put('/system-settings', authenticateToken, requireRole('Admin'), handleSaveSettings);

// Backward compatibility: POST delegates to the same handler
app.post('/system-settings', authenticateToken, requireRole('Admin'), handleSaveSettings);

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