const express = require('express');
const router = express.Router();

const {
  getWishlist,
  checkWishlist,
  addToWishlist,
  removeFromWishlist,
  removeFromWishlistByVariant,
  clearWishlist,
  moveToCart
} = require('../controllers/wishlistController');

const { authenticate } = require('../middleware/authMiddleware');

// All wishlist routes require authentication
router.use(authenticate);

// GET /api/wishlist
router.get('/', getWishlist);

// POST /api/wishlist
router.post('/', addToWishlist);

// DELETE /api/wishlist
// Must come before /:wishlistId — DELETE / has no param segment
router.delete('/', clearWishlist);

// GET /api/wishlist/check/:variantId
// Must come before /:wishlistId — otherwise 'check' is matched as a wishlist ID
router.get('/check/:variantId', checkWishlist);

// DELETE /api/wishlist/variant/:variantId
// Must come before /:wishlistId — otherwise 'variant' is matched as a wishlist ID
router.delete('/variant/:variantId', removeFromWishlistByVariant);

// POST /api/wishlist/:wishlistId/move-to-cart
router.post('/:wishlistId/move-to-cart', moveToCart);

// DELETE /api/wishlist/:wishlistId
router.delete('/:wishlistId', removeFromWishlist);

module.exports = router;