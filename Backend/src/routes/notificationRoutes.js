const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  createNotification
} = require('../controllers/notificationController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// All notification routes require authentication
router.get('/', authenticate, getNotifications);
router.get('/:id', authenticate, getNotificationById);
router.patch('/read-all', authenticate, markAllAsRead);
router.patch('/:id/read', authenticate, markAsRead);
router.delete('/read', authenticate, deleteReadNotifications);
router.delete('/:id', authenticate, deleteNotification);

// Admin: send a notification to a user
router.post('/', authenticate, isAdmin, createNotification);

module.exports = router;
