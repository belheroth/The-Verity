const db = require('better-sqlite3')('database.sqlite');
const rows = db.prepare("SELECT * FROM system_settings").all();
console.log(JSON.stringify(rows, null, 2));
