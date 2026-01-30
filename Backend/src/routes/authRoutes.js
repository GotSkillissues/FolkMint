const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  refreshToken
} = require('../controllers/authController');

// Register new user
router.post('/register', register);

// Login user
router.post('/login', login);

// Logout user
router.post('/logout', logout);

// Refresh token
router.post('/refresh-token', refreshToken);

module.exports = router;
