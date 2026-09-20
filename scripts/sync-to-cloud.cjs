const Database = require('../server/node_modules/better-sqlite3');
const path = require('path');
const fs = require('fs');

const serverEnv = path.join(__dirname, '../server/.env');
const prodEnv = path.join(__dirname, '../frontend/.env.production');
if (fs.existsSync(serverEnv)) require('dotenv').config({ path: serverEnv });
if (fs.existsSync(prodEnv)) require('dotenv').config({ path: prodEnv });

const CLOUD_URL = process.env.CLOUD_URL || process.env.VITE_API_URL || 'http://localhost:3001';
const db = new Database(path.join(__dirname, '../server/database.sqlite'));

async function sync() {
  console.log(`📡 Connecting to Cloud Backend at ${CLOUD_URL}...`);

  // 1. Authenticate as System Admin
  const loginRes = await fetch(`${CLOUD_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@verity.com', password: 'admin' })
  });

  if (!loginRes.ok) {
    const text = await loginRes.text();
    throw new Error(`Admin login failed (${loginRes.status}): ${text}`);
  }

  const { token } = await loginRes.json();
  console.log('✅ Admin authenticated on Cloud.');

  // 2. Fetch all local users
  const localUsers = db.prepare('SELECT name, email, password, role, status FROM users').all();
  console.log(`👥 Found ${localUsers.length} local accounts to sync.`);

  // Import users to cloud
  const importRes = await fetch(`${CLOUD_URL}/users/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ users: localUsers })
  });

  if (!importRes.ok) {
    const errText = await importRes.text();
    console.error(`❌ User import failed (${importRes.status}):`, errText);
  } else {
    const importResult = await importRes.json();
    console.log(`✅ Users sync result:`, importResult.message);
  }

  // 3. Fetch & sync classrooms
  const classrooms = db.prepare('SELECT id, code, section, name, subject, instructor FROM classrooms').all();
  if (classrooms.length > 0) {
    console.log(`🏫 Syncing ${classrooms.length} classrooms...`);
    const crRes = await fetch(`${CLOUD_URL}/classrooms`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ classrooms })
    });
    if (crRes.ok) {
      console.log('✅ Classrooms synced successfully.');
    } else {
      console.error('❌ Classrooms sync failed:', await crRes.text());
    }
  }

  // 4. Fetch & sync classwork
  const allClasswork = db.prepare('SELECT id, classroom_id, title, description, dueDate, type FROM classwork').all();
  const byClassroom = {};
  for (const cw of allClasswork) {
    if (!byClassroom[cw.classroom_id]) byClassroom[cw.classroom_id] = [];
    byClassroom[cw.classroom_id].push(cw);
  }

  for (const [classroomId, cwList] of Object.entries(byClassroom)) {
    console.log(`📝 Syncing ${cwList.length} assignments for classroom ${classroomId}...`);
    const cwRes = await fetch(`${CLOUD_URL}/classwork/${classroomId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ classwork: cwList })
    });
    if (cwRes.ok) {
      console.log(`✅ Classwork for classroom ${classroomId} synced.`);
    } else {
      console.error(`❌ Classwork sync failed for ${classroomId}:`, await cwRes.text());
    }
  }

  // 5. Verify final user list on Cloud
  const verifyRes = await fetch(`${CLOUD_URL}/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (verifyRes.ok) {
    const data = await verifyRes.json();
    console.log(`\n🎉 Verification: Cloud now has ${data.users?.length} accounts:`);
    console.table(data.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status })));
  }

  db.close();
}

sync().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
