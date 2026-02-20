const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getSalesReport,
  getTopProducts,
  getOrderStatusBreakdown,
  getLowStockProducts,
  getRecentActivity,
  getCategoryPerformance
} = require('../controllers/analyticsController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// All analytics routes are admin-only
router.get('/dashboard', authenticate, isAdmin, getDashboardStats);
router.get('/sales', authenticate, isAdmin, getSalesReport);
router.get('/top-products', authenticate, isAdmin, getTopProducts);
router.get('/order-status', authenticate, isAdmin, getOrderStatusBreakdown);
router.get('/low-stock', authenticate, isAdmin, getLowStockProducts);
router.get('/recent-activity', authenticate, isAdmin, getRecentActivity);
router.get('/categories', authenticate, isAdmin, getCategoryPerformance);

module.exports = router;
