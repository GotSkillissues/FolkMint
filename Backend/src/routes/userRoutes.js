const express = require('express');
const router = express.Router();

const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserPreferences
} = require('../controllers/userController');

const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// GET /api/users/me/preferences
// Must be before /:id — otherwise Express matches 'me' as a user ID
router.get('/me/preferences', authenticate, getUserPreferences);

// GET /api/users
// Admin only
router.get('/', authenticate, isAdmin, getUsers);

// GET /api/users/:id
// Admin can fetch any user. Customer can only fetch their own.
router.get('/:id', authenticate, getUserById);

// PATCH /api/users/:id
// Admin can update any user. Customer can only update their own.
router.patch('/:id', authenticate, updateUser);

// DELETE /api/users/:id
// Admin only
router.delete('/:id', authenticate, isAdmin, deleteUser);

module.exports = router;