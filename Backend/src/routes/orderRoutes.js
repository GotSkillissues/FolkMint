const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  cancelOrder,
  deleteOrder
} = require('../controllers/orderController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// Get all orders (User: own, Admin: all)
router.get('/', authenticate, getOrders);

// Get order by ID
router.get('/:id', authenticate, getOrderById);

// Create new order from cart
router.post('/', authenticate, createOrder);

// Update order status (Admin only)
router.put('/:id', authenticate, isAdmin, updateOrder);

// Cancel order (User can cancel own pending orders)
router.post('/:id/cancel', authenticate, cancelOrder);

// Delete order (Admin only)
router.delete('/:id', authenticate, isAdmin, deleteOrder);

module.exports = router;
