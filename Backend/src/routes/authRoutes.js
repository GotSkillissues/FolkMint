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
const { authLimiter, sensitiveLimiter } = require('../middleware/rateLimitMiddleware');

// Register new user
router.post('/register', authLimiter, register);

// Login user
router.post('/login', authLimiter, login);

// Logout user
router.post('/logout', authenticate, logout);

// Refresh token — rate limited to prevent token farming
router.post('/refresh-token', sensitiveLimiter, refreshToken);

// Get current user profile
router.get('/profile', authenticate, getProfile);
router.get('/me', authenticate, getProfile);

module.exports = router;
