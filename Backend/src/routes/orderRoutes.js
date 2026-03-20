const express = require('express');
const router = express.Router();

const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderController');

const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// GET /api/orders
// Admin: all orders. Customer: own orders only.
router.get('/', authenticate, getOrders);

// POST /api/orders
// Authenticated. Creates order from current cart.
router.post('/', authenticate, createOrder);

// GET /api/orders/:id
// Admin can fetch any order. Customer can only fetch their own.
router.get('/:id', authenticate, getOrderById);

// PATCH /api/orders/:id/status
// Admin only. Enforces valid forward transitions.
router.patch('/:id/status', authenticate, isAdmin, updateOrderStatus);

// POST /api/orders/:id/cancel
// Authenticated. Customer can cancel their own pending orders only.
router.post('/:id/cancel', authenticate, cancelOrder);

module.exports = router;