const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  refreshToken,
  getProfile
} = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// Register new user
router.post('/register', register);

// Login user
router.post('/login', login);

// Logout user
router.post('/logout', authenticate, logout);

// Refresh token
router.post('/refresh-token', refreshToken);

// Get current user profile
router.get('/profile', authenticate, getProfile);
router.get('/me', authenticate, getProfile);

module.exports = router;
