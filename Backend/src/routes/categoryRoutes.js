const express = require('express');
const router = express.Router();

const {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  getChildrenWithProducts,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// GET /api/categories
// Public. ?tree=true returns nested structure
router.get('/', getCategories);

// GET /api/categories/slug/:slug
// Must be before /:id — otherwise 'slug' gets matched as a category ID
router.get('/slug/:slug', getCategoryBySlug);

// GET /api/categories/:id/children-with-products
// Must be before /:id
router.get('/:id/children-with-products', getChildrenWithProducts);

// GET /api/categories/:id
router.get('/:id', getCategoryById);

// POST /api/categories
// Admin only
router.post('/', authenticate, isAdmin, createCategory);

// PATCH /api/categories/:id
// Admin only
router.patch('/:id', authenticate, isAdmin, updateCategory);

// DELETE /api/categories/:id
// Admin only
router.delete('/:id', authenticate, isAdmin, deleteCategory);

module.exports = router;