const express = require('express');
const router = express.Router();

const {
  getPayments,
  getPaymentById,
  updatePaymentStatus
} = require('../controllers/paymentController');

const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// GET /api/payments
// Admin: all payments. Customer: own payments only.
router.get('/', authenticate, getPayments);

// GET /api/payments/:id
// Admin can fetch any payment. Customer can only fetch their own.
router.get('/:id', authenticate, getPaymentById);

// PATCH /api/payments/:id/status
// Admin only. Used for gateway callbacks and manual corrections.
router.patch('/:id/status', authenticate, isAdmin, updatePaymentStatus);

module.exports = router;