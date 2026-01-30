const express = require('express');
const router = express.Router();
const {
  getPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod
} = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');

// All payment method routes require authentication
router.use(authenticate);

// Get user's payment methods
router.get('/', getPaymentMethods);

// Get payment method by ID
router.get('/:id', getPaymentMethodById);

// Create new payment method
router.post('/', createPaymentMethod);

// Update payment method
router.put('/:id', updatePaymentMethod);

// Set default payment method
router.put('/:id/default', setDefaultPaymentMethod);

// Delete payment method
router.delete('/:id', deletePaymentMethod);

module.exports = router;
