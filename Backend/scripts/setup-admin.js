// Admin setup script — run with: node scripts/setup-admin.js
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL    = 'admin@folkmint.com';
const ADMIN_PASSWORD = 'FolkMint@Admin1';

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'folkmint',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'hqhq',
});

async function setupAdmin() {
  console.log('Connecting to database…');

  // 1. Generate a proper bcrypt hash
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // 2. Try to update the existing admin row first
  const upd = await pool.query(
    `UPDATE users
        SET password_hash = $1, updated_at = NOW()
      WHERE role = 'admin' AND username = $2
      RETURNING user_id, username, email, role`,
    [hash, ADMIN_USERNAME]
  );

  let adminUser;

  if (upd.rowCount > 0) {
    adminUser = upd.rows[0];
    console.log('Updated existing admin:', adminUser);
  } else {
    // 3. No such admin row — insert a fresh one
    const ins = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, 'Admin', 'User', 'admin')
       ON CONFLICT (username) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role          = 'admin',
             updated_at    = NOW()
       RETURNING user_id, username, email, role`,
      [ADMIN_USERNAME, ADMIN_EMAIL, hash]
    );
    adminUser = ins.rows[0];
    console.log('Inserted admin:', adminUser);
  }

  // 4. Make sure user_preferences row exists (required by profile endpoint)
  await pool.query(
    `INSERT INTO user_preferences (user_id, view_count)
     VALUES ($1, 0)
     ON CONFLICT DO NOTHING`,
    [adminUser.user_id]
  );

  // 5. Verify the hash round-trips correctly
  const row = await pool.query(
    'SELECT password_hash FROM users WHERE user_id = $1',
    [adminUser.user_id]
  );
  const ok = await bcrypt.compare(ADMIN_PASSWORD, row.rows[0].password_hash);

  console.log('\n══════════════════════════════════');
  console.log('  Admin credentials');
  console.log('══════════════════════════════════');
  console.log('  Username :', ADMIN_USERNAME);
  console.log('  Email    :', ADMIN_EMAIL);
  console.log('  Password :', ADMIN_PASSWORD);
  console.log('  Hash OK  :', ok ? '✓ PASS' : '✗ FAIL');
  console.log('══════════════════════════════════\n');

  if (!ok) process.exitCode = 1;
}

setupAdmin()
  .catch(err => { console.error('Error:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
