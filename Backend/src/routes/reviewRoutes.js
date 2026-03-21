const express = require('express');
const router  = express.Router();

const {
  getAllReviews,
  getProductReviews,
  getMyReviews,
  createReview,
  updateReview,
  deleteReview,
} = require('../controllers/reviewController');

const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// GET /api/reviews
// Admin only. All reviews across all users with product + user info.
// Must be before /:id
router.get('/', authenticate, isAdmin, getAllReviews);

// GET /api/reviews/product/:productId
// Public. Must be before /:id
router.get('/product/:productId', getProductReviews);

// GET /api/reviews/my-reviews
// Authenticated. Must be before /:id
router.get('/my-reviews', authenticate, getMyReviews);

// POST /api/reviews
// Authenticated. Purchase check enforced in controller.
router.post('/', authenticate, createReview);

// PATCH /api/reviews/:id
// Authenticated. User can only edit their own review.
router.patch('/:id', authenticate, updateReview);

// DELETE /api/reviews/:id
// User can delete their own. Admin can delete any.
router.delete('/:id', authenticate, deleteReview);

module.exports = router;