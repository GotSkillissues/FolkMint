const express = require('express');
const router = express.Router();
const {
  getPayments,
  getPaymentById,
  processPayment,
  updatePaymentStatus
} = require('../controllers/paymentController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// Get payments (User: own, Admin: all)
router.get('/', authenticate, getPayments);

// Get payment by ID
router.get('/:id', authenticate, getPaymentById);

// Process payment
router.post('/process', authenticate, processPayment);

// Update payment status (Admin only)
router.put('/:id/status', authenticate, isAdmin, updatePaymentStatus);

module.exports = router;
