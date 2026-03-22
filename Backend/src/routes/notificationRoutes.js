const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/notificationController');

const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// All notification routes require authentication
router.use(authenticate);

// GET /api/notifications
router.get('/', getNotifications);

// GET /api/notifications/unread-count
// Must come before /:id — otherwise 'unread-count' is matched as a notification ID
router.get('/unread-count', getUnreadCount);

// PATCH /api/notifications/read-all
// Must come before /:id — otherwise 'read-all' is matched as a notification ID
router.patch('/read-all', markAllAsRead);

// DELETE /api/notifications/read
// Must come before /:id — otherwise 'read' is matched as a notification ID
router.delete('/read', deleteReadNotifications);

// POST /api/notifications/system
// Admin only. Single user or broadcast.
// Must come before /:id — otherwise 'system' is matched as a notification ID
router.post('/system', isAdmin, sendSystemNotification);

// GET /api/notifications/sent-log
// Admin only. Distinct system notifications sent, grouped to avoid duplication.
router.get('/sent-log', isAdmin, getSentLog);

// GET /api/notifications/:id
router.get('/:id', getNotificationById);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', markAsRead);

// DELETE /api/notifications/:id
router.delete('/:id', deleteNotification);

module.exports = router;