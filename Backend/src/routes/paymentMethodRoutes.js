const express = require('express');
const router = express.Router();

const {
  getPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod
} = require('../controllers/paymentController');

const { authenticate } = require('../middleware/authMiddleware');

// All payment method routes require authentication
router.use(authenticate);

// GET /api/payment-methods
router.get('/', getPaymentMethods);

// POST /api/payment-methods
router.post('/', createPaymentMethod);

// GET /api/payment-methods/:id
router.get('/:id', getPaymentMethodById);

// PATCH /api/payment-methods/:id/default
// Must come before /:id to avoid 'default' being matched as an ID
// In practice Express handles this correctly since /default is a second
// segment, but explicit ordering makes intent clear
router.patch('/:id/default', setDefaultPaymentMethod);

// DELETE /api/payment-methods/:id
router.delete('/:id', deletePaymentMethod);

module.exports = router;