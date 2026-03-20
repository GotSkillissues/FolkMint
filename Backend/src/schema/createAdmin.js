const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

const parseArgs = (argv) => {
  const parsed = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    i += 1;
  }

  return parsed;
};

const normalizeOptionalText = (value) => {
  const trimmed = String(value || '').trim();
  return trimmed.length ? trimmed : null;
};

const getConfig = () => {
  const args = parseArgs(process.argv.slice(2));

  const email = String(args.email || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(args.password || process.env.ADMIN_PASSWORD || '');
  const firstName = normalizeOptionalText(args.first_name || process.env.ADMIN_FIRST_NAME);
  const lastName = normalizeOptionalText(args.last_name || process.env.ADMIN_LAST_NAME);

  return { email, password, firstName, lastName };
};

const printUsage = () => {
  console.log('Usage: node src/schema/createAdmin.js --email <email> --password <password> [--first_name <first>] [--last_name <last>]');
  console.log('Or set env vars: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME');
};

const validateInput = ({ email, password }) => {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new Error('Invalid email format.');
  }

  if (!Number.isInteger(BCRYPT_SALT_ROUNDS) || BCRYPT_SALT_ROUNDS < 10) {
    throw new Error('BCRYPT_SALT_ROUNDS must be an integer >= 10.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
};

const createOrPromoteAdmin = async ({ email, password, firstName, lastName }) => {
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, 'admin')
     ON CONFLICT (email)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       first_name = COALESCE(EXCLUDED.first_name, users.first_name),
       last_name = COALESCE(EXCLUDED.last_name, users.last_name),
       role = 'admin',
       updated_at = NOW()
     RETURNING user_id, email, first_name, last_name, role, created_at, updated_at`,
    [email, passwordHash, firstName, lastName]
  );

  return result.rows[0];
};

const run = async () => {
  try {
    const config = getConfig();
    validateInput(config);

    const user = await createOrPromoteAdmin(config);
    console.log('Admin user is ready:');
    console.log({
      user_id: user.user_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (error) {
    console.error('Failed to create admin:', error.message);
    printUsage();
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
};

run();
