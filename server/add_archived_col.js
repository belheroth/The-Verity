const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join('C:/Users/vicfa/The-Verity/server', 'database.sqlite'));

try {
    db.exec(`ALTER TABLE classrooms ADD COLUMN archived INTEGER DEFAULT 0;`);
    console.log("Added archived column");
} catch(e) {
    if (e.message.includes('duplicate column name')) {
        console.log("Column already exists");
    } else {
        console.error("Error:", e);
    }
}
