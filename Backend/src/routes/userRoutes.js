const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserPreferences,
  updateUserPreferences
} = require('../controllers/userController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// Get all users (Admin only)
router.get('/', authenticate, isAdmin, getUsers);

// Get user preferences (authenticated user)
router.get('/preferences', authenticate, getUserPreferences);

// Update user preferences (authenticated user)
router.put('/preferences', authenticate, updateUserPreferences);

// Get user by ID
router.get('/:id', authenticate, getUserById);

// Create new user (Admin only)
router.post('/', authenticate, isAdmin, createUser);

// Update user
router.put('/:id', authenticate, updateUser);

// Delete user
router.delete('/:id', authenticate, deleteUser);

module.exports = router;
