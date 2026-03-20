const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set');
}

if (!Number.isInteger(BCRYPT_SALT_ROUNDS) || BCRYPT_SALT_ROUNDS < 10) {
  throw new Error('BCRYPT_SALT_ROUNDS must be an integer >= 10');
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const normalizeOptionalText = (value) => {
  const trimmed = String(value || '').trim();
  return trimmed.length ? trimmed : null;
};

const validatePassword = (password) => {
  const value = String(password || '');

  if (value.length < 6) {
    return 'Password must be at least 6 characters';
  }
  if (!/[A-Z]/.test(value)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[0-9]/.test(value)) {
    return 'Password must contain at least one number';
  }

  return null;
};

const buildUserResponse = (user) => ({
  user_id: user.user_id,
  email: user.email,
  first_name: user.first_name,
  last_name: user.last_name,
  role: user.role
});

const generateTokens = (user) => {
  const token = jwt.sign(
    {
      userId: user.user_id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.user_id
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN
    }
  );

  return { token, refreshToken };
};

const isUniqueViolation = (error) => error && error.code === '23505';

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const first_name = normalizeOptionalText(req.body?.first_name);
    const last_name = normalizeOptionalText(req.body?.last_name);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, 'customer')
       RETURNING user_id, email, first_name, last_name, role, created_at`,
      [email, password_hash, first_name, last_name]
    );

    const user = result.rows[0];
    const tokens = generateTokens(user);

    return res.status(201).json({
      message: 'Account created successfully',
      user: buildUserResponse(user),
      ...tokens
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      `SELECT user_id, email, password_hash, first_name, last_name, role
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tokens = generateTokens(user);

    return res.status(200).json({
      message: 'Login successful',
      user: buildUserResponse(user),
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
};

// POST /api/auth/logout
// Note: with stateless JWT and no token store in the current schema,
// logout can only instruct the client to discard tokens.
// True refresh-token revocation needs a persistence layer.
const logout = async (_req, res) => {
  return res.status(200).json({
    message: 'Logged out successfully. Please remove the access and refresh tokens on the client.'
  });
};

// POST /api/auth/refresh-token
const refreshToken = async (req, res) => {
  try {
    const token = String(req.body?.refreshToken || '').trim();

    if (!token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);

    const result = await pool.query(
      `SELECT user_id, email, first_name, last_name, role
       FROM users
       WHERE user_id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const tokens = generateTokens(user);

    return res.status(200).json({
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Refresh token expired. Please log in again.'
      });
    }

    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT user_id, email, first_name, last_name, role, created_at
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe
};