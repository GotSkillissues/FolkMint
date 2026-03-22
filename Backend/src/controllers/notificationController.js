const { pool } = require('../config/database');

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const NOTIFICATION_TYPES = [
  'order_placed',
  'order_confirmed',
  'order_shipped',
  'order_delivered',
  'order_cancelled',
  'back_in_stock',
  'system'
];

const buildNotificationResponse = (row) => ({
  notification_id: row.notification_id,
  user_id: row.user_id,
  type: row.type,
  title: row.title,
  message: row.message,
  is_read: row.is_read,
  related_id: row.related_id || null,
  related_type: row.related_type || null,
  created_at: row.created_at
});

// GET /api/notifications
// Authenticated. Returns paginated notifications for the current user.
// Optional filter: ?is_read=true or ?is_read=false
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const conditions = ['user_id = $1'];
    const params = [userId];
    let idx = 2;

    if (req.query.is_read !== undefined) {
      const is_read = req.query.is_read === 'true';
      conditions.push(`is_read = $${idx}`);
      params.push(is_read);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM notification
       ${whereClause}`,
      params
    );
    const total = countResult.rows[0].count;

    const unreadResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM notification
       WHERE user_id = $1
         AND is_read = false`,
      [userId]
    );
    const unread_count = unreadResult.rows[0].count;

    const result = await pool.query(
      `SELECT
         notification_id, user_id, type, title,
         message, is_read, related_id, related_type, created_at
       FROM notification
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      notifications: result.rows.map(buildNotificationResponse),
      unread_count,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// GET /api/notifications/unread-count
// Authenticated. Lightweight endpoint for the frontend bell badge.
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM notification
       WHERE user_id = $1
         AND is_read = false`,
      [userId]
    );

    return res.status(200).json({ unread_count: result.rows[0].count });
  } catch (error) {
    console.error('Get unread count error:', error);
    return res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

// GET /api/notifications/:id
// Authenticated. Returns a single notification belonging to the current user.
const getNotificationById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = parsePositiveInt(req.params.id);

    if (!notificationId) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const result = await pool.query(
      `SELECT
         notification_id, user_id, type, title,
         message, is_read, related_id, related_type, created_at
       FROM notification
       WHERE notification_id = $1
         AND user_id = $2`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.status(200).json({
      notification: buildNotificationResponse(result.rows[0])
    });
  } catch (error) {
    console.error('Get notification error:', error);
    return res.status(500).json({ error: 'Failed to fetch notification' });
  }
};

// PATCH /api/notifications/:id/read
// Authenticated. Marks a single notification as read.
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = parsePositiveInt(req.params.id);

    if (!notificationId) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const result = await pool.query(
      `UPDATE notification
       SET is_read = true
       WHERE notification_id = $1
         AND user_id = $2
       RETURNING notification_id, user_id, type, title,
                 message, is_read, related_id, related_type, created_at`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.status(200).json({
      message: 'Notification marked as read',
      notification: buildNotificationResponse(result.rows[0])
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// PATCH /api/notifications/read-all
// Authenticated. Marks all unread notifications as read for the current user.
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `UPDATE notification
       SET is_read = true
       WHERE user_id = $1
         AND is_read = false`,
      [userId]
    );

    return res.status(200).json({
      message: 'All notifications marked as read',
      updated_count: result.rowCount
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    return res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

// DELETE /api/notifications/:id
// Authenticated. Deletes a single notification belonging to the current user.
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = parsePositiveInt(req.params.id);

    if (!notificationId) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const result = await pool.query(
      `DELETE FROM notification
       WHERE notification_id = $1
         AND user_id = $2
       RETURNING notification_id`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// DELETE /api/notifications/read
// Authenticated. Clears all read notifications for the current user.
const deleteReadNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `DELETE FROM notification
       WHERE user_id = $1
         AND is_read = true`,
      [userId]
    );

    return res.status(200).json({
      message: 'Read notifications cleared',
      deleted_count: result.rowCount
    });
  } catch (error) {
    console.error('Delete read notifications error:', error);
    return res.status(500).json({ error: 'Failed to delete notifications' });
  }
};

// POST /api/notifications/system
// Admin only. Sends a system notification to a specific user or all customers.
// body: { user_id?, title, message }
const sendSystemNotification = async (req, res) => {
  try {
    const body = req.body || {};
    const title = String(body.title || '').trim();
    const message = String(body.message || '').trim();
    const user_id = parsePositiveInt(body.user_id) || null;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    if (user_id) {
      const userCheck = await pool.query(
        `SELECT user_id
         FROM users
         WHERE user_id = $1`,
        [user_id]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      await pool.query(
        `INSERT INTO notification (user_id, type, title, message)
         VALUES ($1, 'system', $2, $3)`,
        [user_id, title, message]
      );

      return res.status(201).json({
        message: 'System notification sent',
        sent_to: 1
      });
    }

    const result = await pool.query(
      `INSERT INTO notification (user_id, type, title, message)
       SELECT user_id, 'system', $1, $2
       FROM users
       WHERE role = 'customer'`,
      [title, message]
    );

    return res.status(201).json({
      message: 'System notification broadcast to all customers',
      sent_to: result.rowCount
    });
  } catch (error) {
    console.error('Send system notification error:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
};

// Internal helper for other controllers/services.
// Safe no-op if type is invalid.
const createNotificationInternal = async (
  userId,
  type,
  title,
  message,
  related_id = null,
  related_type = null
) => {
  try {
    if (!NOTIFICATION_TYPES.includes(type)) {
      return;
    }

    await pool.query(
      `INSERT INTO notification (user_id, type, title, message, related_id, related_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, title, message, related_id, related_type]
    );
  } catch (error) {
    console.error('Create notification internal error:', error);
  }
};

// GET /api/notifications/sent-log
// Admin only. Returns distinct system notifications that were sent,
// grouped by title + message + created_at to avoid per-user duplication.
const getSentLog = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT
         MIN(notification_id) AS notification_id,
         title,
         message,
         COUNT(*)::int        AS sent_to,
         MIN(created_at)      AS created_at
       FROM notification
       WHERE type = 'system'
       GROUP BY title, message, DATE_TRUNC('second', created_at)
       ORDER BY MIN(created_at) DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (
         SELECT 1 FROM notification
         WHERE type = 'system'
         GROUP BY title, message, DATE_TRUNC('second', created_at)
       ) sub`
    );

    const total = parseInt(countResult.rows[0].count, 10);

    return res.status(200).json({
      notifications: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get sent log error:', error);
    return res.status(500).json({ error: 'Failed to fetch sent log' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  sendSystemNotification,
  createNotificationInternal,
  getSentLog,
};