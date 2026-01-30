const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts
} = require('../controllers/categoryController');
const { authenticate, isAdmin, optionalAuth } = require('../middleware/authMiddleware');

// Get all categories (public)
router.get('/', getCategories);

// Get category by ID (public)
router.get('/:id', getCategoryById);

// Get products in category (public)
router.get('/:id/products', getCategoryProducts);

// Create new category (Admin only)
router.post('/', authenticate, isAdmin, createCategory);

// Update category (Admin only)
router.put('/:id', authenticate, isAdmin, updateCategory);

// Delete category (Admin only)
router.delete('/:id', authenticate, isAdmin, deleteCategory);

module.exports = router;
