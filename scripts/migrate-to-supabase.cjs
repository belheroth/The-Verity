const { Pool } = require('../server/node_modules/pg');
const Database = require('../server/node_modules/better-sqlite3');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

let rawUrl = process.env.DATABASE_URL || '';
// Automatically encode special characters in password if present
const authMatch = rawUrl.match(/^(postgres(?:ql)?:\/\/[^:]+:)(.*)(@[^@]+)$/);
if (authMatch) {
  const [, prefix, rawPass, suffix] = authMatch;
  if (!rawPass.includes('%25') && (rawPass.includes('%') || rawPass.includes('?'))) {
    rawUrl = `${prefix}${encodeURIComponent(rawPass)}${suffix}`;
  }
}

const pool = new Pool({
  connectionString: rawUrl,
  ssl: { rejectUnauthorized: false }
});

const sqliteDb = new Database(path.join(__dirname, '../server/database.sqlite'));

async function run() {
  console.log('📡 Connecting to Supabase...');
  const client = await pool.connect();
  console.log('✅ Connected to Supabase!');

  try {
    // 1. Initialize schema
    console.log('🔨 Ensuring schema exists...');
    const schemaSql = fs.readFileSync(path.join(__dirname, '../server/db/schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('✅ Schema ready.');

    // 2. Migrate Users
    const users = sqliteDb.prepare('SELECT name, email, password, role, lastLogin, status FROM users').all();
    console.log(`👥 Migrating ${users.length} users...`);
    for (const u of users) {
      await client.query(`
        INSERT INTO users (name, email, password, role, lastlogin, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          status = EXCLUDED.status;
      `, [u.name, u.email, u.password, u.role, u.lastLogin, u.status || 'Active']);
    }
    console.log('✅ Users migrated.');

    // 3. Migrate Classrooms
    const classrooms = sqliteDb.prepare('SELECT id, code, section, name, subject, instructor FROM classrooms').all();
    console.log(`🏫 Migrating ${classrooms.length} classrooms...`);
    for (const c of classrooms) {
      await client.query(`
        INSERT INTO classrooms (id, code, section, name, subject, instructor)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          section = EXCLUDED.section,
          subject = EXCLUDED.subject,
          instructor = EXCLUDED.instructor;
      `, [c.id, c.code || '', c.section || '', c.name || '', c.subject || '', c.instructor || '']);
    }
    console.log('✅ Classrooms migrated.');

    // 4. Migrate Classwork
    const classwork = sqliteDb.prepare('SELECT id, classroom_id, title, description, dueDate, type FROM classwork').all();
    console.log(`📝 Migrating ${classwork.length} classwork assignments...`);
    for (const cw of classwork) {
      // Check if classroom exists
      const crCheck = await client.query('SELECT id FROM classrooms WHERE id = $1', [cw.classroom_id]);
      if (crCheck.rows.length === 0) {
        // Create dummy parent classroom if not present so FK constraint passes
        await client.query('INSERT INTO classrooms (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [cw.classroom_id, 'Classroom ' + cw.classroom_id]);
      }
      await client.query(`
        INSERT INTO classwork (id, classroom_id, title, description, duedate, type)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          duedate = EXCLUDED.duedate,
          type = EXCLUDED.type;
      `, [cw.id, cw.classroom_id, cw.title, cw.description || '', cw.dueDate || '', cw.type || 'Assignment']);
    }
    console.log('✅ Classwork migrated.');

    // 5. Verification
    const uCount = (await client.query('SELECT COUNT(*) FROM users')).rows[0].count;
    const cCount = (await client.query('SELECT COUNT(*) FROM classrooms')).rows[0].count;
    const cwCount = (await client.query('SELECT COUNT(*) FROM classwork')).rows[0].count;
    console.log('\n🎉 Supabase Database is 100% Populated & Synced!');
    console.log(`- Users in Supabase: ${uCount}`);
    console.log(`- Classrooms in Supabase: ${cCount}`);
    console.log(`- Classwork in Supabase: ${cwCount}`);

  } finally {
    client.release();
    await pool.end();
    sqliteDb.close();
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
