// User Controller - Handle user-related operations
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

// Get all users (Admin only)
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, 
             u.role, u.created_at, u.updated_at, up.view_count
      FROM users u
      LEFT JOIN user_preferences up ON u.user_id = up.user_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (role) {
      query += ` AND u.role = $${idx}`;
      params.push(role);
      idx++;
    }

    if (search) {
      query += ` AND (u.username ILIKE $${idx} OR u.email ILIKE $${idx} OR u.first_name ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    const countResult = await pool.query(
      query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY u.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless admin
    if (req.user.role !== 'admin' && req.user.userId !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, 
              u.role, u.created_at, u.updated_at, up.view_count
       FROM users u
       LEFT JOIN user_preferences up ON u.user_id = up.user_id
       WHERE u.user_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user: ' + error.message });
  }
};

// Create user (Admin only)
const createUser = async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, role = 'customer' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, username, email, first_name, last_name, role, created_at`,
      [username, email, password_hash, first_name, last_name, role]
    );

    await pool.query(
      'INSERT INTO user_preferences (user_id, view_count) VALUES ($1, 0)',
      [result.rows[0].user_id]
    );

    res.status(201).json({ message: 'User created', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user: ' + error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, username, password, role } = req.body;

    if (req.user.role !== 'admin' && req.user.userId !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (first_name !== undefined) {
      updates.push(`first_name = $${idx}`);
      params.push(first_name);
      idx++;
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${idx}`);
      params.push(last_name);
      idx++;
    }
    if (username) {
      updates.push(`username = $${idx}`);
      params.push(username);
      idx++;
    }
    if (password) {
      updates.push(`password_hash = $${idx}`);
      params.push(await bcrypt.hash(password, 10));
      idx++;
    }
    if (role && req.user.role === 'admin') {
      updates.push(`role = $${idx}`);
      params.push(role);
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = $${idx}
       RETURNING user_id, username, email, first_name, last_name, role, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User updated', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user: ' + error.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin' && req.user.userId !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING user_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user: ' + error.message });
  }
};

// Get user preferences
const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT up.preference_id, up.view_count,
              COALESCE(json_agg(json_build_object('category_id', c.category_id, 'name', c.name)) 
              FILTER (WHERE c.category_id IS NOT NULL), '[]') as preferred_categories
       FROM user_preferences up
       LEFT JOIN preference_category pc ON up.preference_id = pc.preference_id
       LEFT JOIN category c ON pc.category_id = c.category_id
       WHERE up.user_id = $1
       GROUP BY up.preference_id`,
      [userId]
    );

    res.status(200).json({ preferences: result.rows[0] || { view_count: 0, preferred_categories: [] } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get preferences: ' + error.message });
  }
};

// Update user preferences
const updateUserPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category_ids } = req.body;

    if (!Array.isArray(category_ids)) {
      return res.status(400).json({ error: 'category_ids must be an array' });
    }

    const prefResult = await pool.query(
      'SELECT preference_id FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    if (prefResult.rows.length === 0) {
      return res.status(404).json({ error: 'User preferences not found' });
    }

    const preferenceId = prefResult.rows[0].preference_id;

    // Delete existing and insert new
    await pool.query('DELETE FROM preference_category WHERE preference_id = $1', [preferenceId]);

    if (category_ids.length > 0) {
      const values = category_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
      await pool.query(
        `INSERT INTO preference_category (preference_id, category_id) VALUES ${values}`,
        [preferenceId, ...category_ids]
      );
    }

    res.status(200).json({ message: 'Preferences updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences: ' + error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserPreferences,
  updateUserPreferences
};
