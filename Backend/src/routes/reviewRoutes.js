const express = require('express');
const router = express.Router();
const {
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  getProductReviewSummary,
  getUserReviews
} = require('../controllers/reviewController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');

// Get reviews (public, optionally filtered by product)
router.get('/', getReviews);

// Get user's reviews (authenticated)
router.get('/my-reviews', authenticate, getUserReviews);

// Get product review summary (public)
router.get('/product/:product_id/summary', getProductReviewSummary);

// Get review by ID (public)
router.get('/:id', getReviewById);

// Create review (authenticated)
router.post('/', authenticate, createReview);

// Update review (authenticated, owner or admin)
router.put('/:id', authenticate, updateReview);

// Delete review (authenticated, owner or admin)
router.delete('/:id', authenticate, deleteReview);

module.exports = router;
