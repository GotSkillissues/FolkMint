const express = require('express');
const router = express.Router();

const { register, login, logout, refreshToken, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { authLimiter, sensitiveLimiter } = require('../middleware/rateLimitMiddleware');

// POST /api/auth/register
router.post('/register', authLimiter, register);

// POST /api/auth/login
router.post('/login', authLimiter, login);

// POST /api/auth/logout
router.post('/logout', authenticate, logout);

// POST /api/auth/refresh-token
router.post('/refresh-token', sensitiveLimiter, refreshToken);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

module.exports = router;