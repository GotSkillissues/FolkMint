// Notification Controller - Handle user notifications
const { pool } = require('../config/database');

// Get user's notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, is_read } = req.query;
    const offset = (page - 1) * limit;
    const params = [userId];
    let idx = 2;

    let query = 'SELECT * FROM notification WHERE user_id = $1';

    if (is_read !== undefined) {
      query += ` AND is_read = $${idx}`;
      params.push(is_read === 'true');
      idx++;
    }

    const countResult = await pool.query(
      query.replace('SELECT *', 'SELECT COUNT(*)'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Unread count
    const unreadResult = await pool.query(
      'SELECT COUNT(*) FROM notification WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    const unread_count = parseInt(unreadResult.rows[0].count);

    query += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      notifications: result.rows,
      unread_count,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications: ' + error.message });
  }
};

// Get notification by ID
const getNotificationById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM notification WHERE notification_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(200).json({ notification: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notification: ' + error.message });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE notification SET is_read = true WHERE notification_id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification marked as read', notification: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read: ' + error.message });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'UPDATE notification SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.status(200).json({ message: `${result.rowCount} notifications marked as read` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read: ' + error.message });
  }
};

// Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM notification WHERE notification_id = $1 AND user_id = $2 RETURNING notification_id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification: ' + error.message });
  }
};

// Delete all read notifications
const deleteReadNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'DELETE FROM notification WHERE user_id = $1 AND is_read = true',
      [userId]
    );

    res.status(200).json({ message: `${result.rowCount} read notifications deleted` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notifications: ' + error.message });
  }
};

// Create notification - internal helper used by other controllers/events
// Also exposed as admin endpoint for system-wide notifications
const createNotification = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { user_id, type, title, message, related_id, related_type } = req.body;

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!user_id || !type || !title || !message) {
      return res.status(400).json({ error: 'user_id, type, title, and message are required' });
    }

    const validTypes = [
      'order_placed', 'order_confirmed', 'order_shipped',
      'order_delivered', 'order_cancelled', 'review_approved', 'system'
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    const result = await pool.query(
      `INSERT INTO notification (user_id, type, title, message, related_id, related_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, type, title, message, related_id || null, related_type || null]
    );

    res.status(201).json({ message: 'Notification created', notification: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create notification: ' + error.message });
  }
};

// Internal helper: create notification without HTTP context (called from other controllers)
const createNotificationInternal = async (userId, type, title, message, related_id = null, related_type = null) => {
  await pool.query(
    `INSERT INTO notification (user_id, type, title, message, related_id, related_type)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, type, title, message, related_id, related_type]
  );
};

module.exports = {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  createNotification,
  createNotificationInternal
};
