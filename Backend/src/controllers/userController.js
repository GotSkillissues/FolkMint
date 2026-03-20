const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
const ALLOWED_ROLES = new Set(['customer', 'admin']);

if (!Number.isInteger(BCRYPT_SALT_ROUNDS) || BCRYPT_SALT_ROUNDS < 10) {
  throw new Error('BCRYPT_SALT_ROUNDS must be an integer >= 10');
}

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
  role: user.role,
  created_at: user.created_at,
  updated_at: user.updated_at
});

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// GET /api/users
// Admin only — route should also be protected by admin middleware.
const getUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const conditions = [];
    const params = [];
    let idx = 1;

    if (role) {
      if (!ALLOWED_ROLES.has(role)) {
        return res.status(400).json({ error: 'Invalid role filter' });
      }
      conditions.push(`role = $${idx}`);
      params.push(role);
      idx++;
    }

    if (search) {
      conditions.push(
        `(email ILIKE $${idx} OR first_name ILIKE $${idx} OR last_name ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    );
    const total = Number.parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT user_id, email, first_name, last_name, role, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      users: result.rows.map(buildUserResponse),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// GET /api/users/:id
// Admin can fetch any user. Customer can only fetch their own.
const getUserById = async (req, res) => {
  try {
    const targetId = parsePositiveInt(req.params.id);

    if (!targetId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!req.user || (req.user.role !== 'admin' && req.user.userId !== targetId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT user_id, email, first_name, last_name, role, created_at, updated_at
       FROM users
       WHERE user_id = $1`,
      [targetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: buildUserResponse(result.rows[0]) });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// PATCH /api/users/:id
// Admin can update any user including role.
// Customer can only update their own name and password.
const updateUser = async (req, res) => {
  try {
    const targetId = parsePositiveInt(req.params.id);

    if (!targetId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!req.user || (req.user.role !== 'admin' && req.user.userId !== targetId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const body = req.body || {};
    const updates = [];
    const params = [];
    let idx = 1;

    if (Object.prototype.hasOwnProperty.call(body, 'first_name')) {
      updates.push(`first_name = $${idx}`);
      params.push(normalizeOptionalText(body.first_name));
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'last_name')) {
      updates.push(`last_name = $${idx}`);
      params.push(normalizeOptionalText(body.last_name));
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'password')) {
      const password = String(body.password || '');
      const passwordError = validatePassword(password);

      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      updates.push(`password_hash = $${idx}`);
      params.push(password_hash);
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'role')) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can change roles' });
      }

      const nextRole = String(body.role || '').trim();
      if (!ALLOWED_ROLES.has(nextRole)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      updates.push(`role = $${idx}`);
      params.push(nextRole);
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(targetId);

    const result = await pool.query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE user_id = $${idx}
       RETURNING user_id, email, first_name, last_name, role, created_at, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      message: 'User updated successfully',
      user: buildUserResponse(result.rows[0])
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
};

// DELETE /api/users/:id
// Admin only — hard delete only when there is no order/review history.
const deleteUser = async (req, res) => {
  try {
    const targetId = parsePositiveInt(req.params.id);

    if (!targetId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user.userId === targetId) {
      return res.status(400).json({
        error: 'You cannot delete your own account from this endpoint'
      });
    }

    const dependencyResult = await pool.query(
      `SELECT
         EXISTS (SELECT 1 FROM orders WHERE user_id = $1) AS has_orders,
         EXISTS (SELECT 1 FROM review WHERE user_id = $1) AS has_reviews`,
      [targetId]
    );

    const { has_orders, has_reviews } = dependencyResult.rows[0];

    if (has_orders || has_reviews) {
      return res.status(409).json({
        error: 'Cannot delete user with order or review history'
      });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING user_id',
      [targetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
};

// GET /api/users/me/preferences
// Preferences are computed from activity signals.
// There is no dedicated user_preferences table in this schema.
const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `WITH category_signals AS (
         SELECT p.category_id, oi.quantity::int AS weight
         FROM order_item oi
         JOIN orders o ON o.order_id = oi.order_id
         JOIN product p ON p.product_id = oi.product_id
         WHERE o.user_id = $1
           AND o.status <> 'cancelled'

         UNION ALL

         SELECT p.category_id, 1 AS weight
         FROM wishlist w
         JOIN product_variant pv ON pv.variant_id = w.variant_id
         JOIN product p ON p.product_id = pv.product_id
         WHERE w.user_id = $1

         UNION ALL

         SELECT p.category_id, c.quantity::int AS weight
         FROM cart c
         JOIN product_variant pv ON pv.variant_id = c.variant_id
         JOIN product p ON p.product_id = pv.product_id
         WHERE c.user_id = $1

         UNION ALL

         SELECT p.category_id, 1 AS weight
         FROM review r
         JOIN product p ON p.product_id = r.product_id
         WHERE r.user_id = $1
       )
       SELECT
         c.category_id,
         c.name,
         SUM(cs.weight)::int AS score
       FROM category_signals cs
       JOIN category c ON c.category_id = cs.category_id
       GROUP BY c.category_id, c.name
       ORDER BY score DESC, c.name ASC
       LIMIT 10`,
      [userId]
    );

    return res.status(200).json({
      preferences: {
        preferred_categories: result.rows,
        note: 'Preferences are computed from purchases, wishlist, cart, and reviews.'
      }
    });
  } catch (error) {
    console.error('Get user preferences error:', error);
    return res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserPreferences
};