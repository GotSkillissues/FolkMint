const express = require('express');
const router = express.Router();
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  moveToCart,
  checkWishlist
} = require('../controllers/wishlistController');
const { authenticate } = require('../middleware/authMiddleware');

// All wishlist routes require authentication
router.get('/', authenticate, getWishlist);
router.post('/', authenticate, addToWishlist);
router.delete('/clear', authenticate, clearWishlist);
router.get('/check/:product_id', authenticate, checkWishlist);
router.post('/:id/move-to-cart', authenticate, moveToCart);
router.delete('/:id', authenticate, removeFromWishlist);

module.exports = router;
