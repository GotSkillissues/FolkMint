const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getSalesReport,
  getTopProducts,
  getOrderStatusBreakdown,
  getLowStockProducts,
  getCategoryPerformance,
  getRecentActivity,
  getReviewStats
} = require('../controllers/analyticsController');

const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// All analytics routes are admin only
router.use(authenticate, isAdmin);

// GET /api/analytics/dashboard
router.get('/dashboard', getDashboardStats);

// GET /api/analytics/sales
// ?period=daily|weekly|monthly&days=30
router.get('/sales', getSalesReport);

// GET /api/analytics/top-products
// ?sort_by=revenue|quantity|orders&limit=10
router.get('/top-products', getTopProducts);

// GET /api/analytics/orders/status-breakdown
router.get('/orders/status-breakdown', getOrderStatusBreakdown);

// GET /api/analytics/low-stock
// ?threshold=5&page=1&limit=20
router.get('/low-stock', getLowStockProducts);

// GET /api/analytics/categories
router.get('/categories', getCategoryPerformance);

// GET /api/analytics/recent-activity
// ?limit=10
router.get('/recent-activity', getRecentActivity);

// GET /api/analytics/reviews
router.get('/reviews', getReviewStats);

module.exports = router;