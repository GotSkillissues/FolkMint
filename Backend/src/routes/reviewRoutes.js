const express = require('express');
const router = express.Router();

const {
  getProductReviews,
  getMyReviews,
  createReview,
  updateReview,
  deleteReview
} = require('../controllers/reviewController');

const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// GET /api/reviews/product/:productId
// Public. Paginated reviews with rating distribution summary.
// Must come before /:id — otherwise 'product' is matched as a review ID
router.get('/product/:productId', getProductReviews);

// GET /api/reviews/my-reviews
// Authenticated. Returns all reviews written by the current user.
// Must come before /:id — otherwise 'my-reviews' is matched as a review ID
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