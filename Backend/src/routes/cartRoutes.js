const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart
} = require('../controllers/cartController');
const { authenticate } = require('../middleware/authMiddleware');

// All cart routes require authentication
router.use(authenticate);

// Get user's cart
router.get('/', getCart);

// Add item to cart
router.post('/', addToCart);

// Sync cart (merge guest cart)
router.post('/sync', syncCart);

// Clear cart
router.delete('/clear', clearCart);

// Update cart item quantity
router.put('/:id', updateCartItem);

// Remove item from cart
router.delete('/:id', removeFromCart);

module.exports = router;
