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

// GET /api/cart
router.get('/', getCart);

// POST /api/cart
router.post('/', addToCart);

// POST /api/cart/sync
// Must come before /:variantId — otherwise 'sync' is matched as a variant ID
router.post('/sync', syncCart);

// DELETE /api/cart
// Must come before /:variantId — otherwise Express never reaches this
// since DELETE / does not have a param segment
router.delete('/', clearCart);

// PATCH /api/cart/:variantId
router.patch('/:variantId', updateCartItem);

// DELETE /api/cart/:variantId
router.delete('/:variantId', removeFromCart);

module.exports = router;