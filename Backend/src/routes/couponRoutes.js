const express = require('express');
const router = express.Router();
const {
  getCoupons,
  getCouponById,
  validateCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon
} = require('../controllers/couponController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// Validate coupon code (authenticated users during checkout)
router.post('/validate', authenticate, validateCoupon);

// Admin routes
router.get('/', authenticate, isAdmin, getCoupons);
router.get('/:id', authenticate, isAdmin, getCouponById);
router.post('/', authenticate, isAdmin, createCoupon);
router.put('/:id', authenticate, isAdmin, updateCoupon);
router.delete('/:id', authenticate, isAdmin, deleteCoupon);

module.exports = router;
