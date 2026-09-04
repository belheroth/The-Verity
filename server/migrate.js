const fs = require('fs');
const path = require('path');
const db = require('./database.js');

const dbJsonPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbJsonPath)) {
    console.log("No database.json found to migrate.");
    process.exit(0);
}

const data = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));

// Migrate Users
const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, name, email, password, role, lastLogin, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
const insertUserNoId = db.prepare('INSERT OR IGNORE INTO users (name, email, password, role, lastLogin, status) VALUES (?, ?, ?, ?, ?, ?)');

if (data.users) {
    db.transaction(() => {
        data.users.forEach(u => {
            if (u.id) {
                insertUser.run(u.id, u.name, u.email, u.password, u.role, u.lastLogin, u.status);
            } else {
                insertUserNoId.run(u.name, u.email, u.password, u.role, u.lastLogin, u.status);
            }
        });
    })();
    console.log(`Migrated ${data.users.length} users.`);
}

// Migrate Classrooms
const insertClassroom = db.prepare('INSERT OR REPLACE INTO classrooms (id, code, section, name, subject, instructor) VALUES (?, ?, ?, ?, ?, ?)');
if (data.classrooms) {
    db.transaction(() => {
        data.classrooms.forEach(c => {
            insertClassroom.run(c.id, c.code || '', c.section || '', c.name || '', c.subject || '', c.instructor || '');
        });
    })();
    console.log(`Migrated ${data.classrooms.length} classrooms.`);
}

// Migrate Classwork
const insertClasswork = db.prepare('INSERT OR REPLACE INTO classwork (id, classroom_id, title, description, dueDate, type) VALUES (?, ?, ?, ?, ?, ?)');
if (data.classwork) {
    let count = 0;
    db.transaction(() => {
        for (const [classroomId, cwArray] of Object.entries(data.classwork)) {
            cwArray.forEach(cw => {
                insertClasswork.run(cw.id, parseInt(classroomId, 10), cw.title, cw.description, cw.dueDate, cw.type || '');
                count++;
            });
        }
    })();
    console.log(`Migrated ${count} classwork items.`);
}

// Migrate Submissions
const insertSubmission = db.prepare('INSERT INTO submissions (assignment_id, student_name, history, submittedAt) VALUES (?, ?, ?, ?)');
// Clear old submissions first so we don't duplicate on re-run
db.prepare('DELETE FROM submissions').run();

if (data.submissions) {
    let count = 0;
    db.transaction(() => {
        for (const [assignmentId, subArray] of Object.entries(data.submissions)) {
            subArray.forEach(sub => {
                insertSubmission.run(parseInt(assignmentId, 10), sub.studentName, JSON.stringify(sub.history || []), sub.submittedAt);
                count++;
            });
        }
    })();
    console.log(`Migrated ${count} submissions.`);
}

// Migrate Security Flags
const insertFlag = db.prepare('INSERT OR REPLACE INTO security_flags (date_string, count) VALUES (?, ?)');
if (data.securityFlags) {
    let count = 0;
    db.transaction(() => {
        for (const [dateString, val] of Object.entries(data.securityFlags)) {
            insertFlag.run(dateString, val);
            count++;
        }
    })();
    console.log(`Migrated ${count} security flag dates.`);
}

console.log("Migration complete!");
