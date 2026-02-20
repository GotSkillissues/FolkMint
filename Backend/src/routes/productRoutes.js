const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  getProductsByCategory,
  searchProducts,
  getFeaturedProducts,
  getNewArrivals,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductVariants,
  createVariant,
  updateVariant,
  updateVariantStock,
  deleteVariant,
  addVariantImage,
  deleteImage
} = require('../controllers/productController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// ==================== SPECIAL ROUTES (must come before /:id) ====================
// Search products
router.get('/search', searchProducts);

// Get featured products
router.get('/featured', getFeaturedProducts);

// Get new arrivals
router.get('/new-arrivals', getNewArrivals);

// Get products by category
router.get('/category/:categoryId', getProductsByCategory);

// ==================== PRODUCT CRUD ====================
// Get all products
router.get('/', getProducts);

// Get product by ID
router.get('/:id', getProductById);

// Create new product (admin)
router.post('/', authenticate, isAdmin, createProduct);

// Update product (admin)
router.put('/:id', authenticate, isAdmin, updateProduct);

// Delete product (admin)
router.delete('/:id', authenticate, isAdmin, deleteProduct);

// ==================== VARIANT ROUTES ====================
// Get variants for a product
router.get('/:productId/variants', getProductVariants);

// Create variant for a product (admin)
router.post('/:productId/variants', authenticate, isAdmin, createVariant);

// ==================== VARIANT BY ID ====================
router.put('/variants/:id', authenticate, isAdmin, updateVariant);
router.patch('/variants/:id/stock', authenticate, isAdmin, updateVariantStock);
router.delete('/variants/:id', authenticate, isAdmin, deleteVariant);

// ==================== IMAGE ROUTES ====================
// Add image to variant (admin)
router.post('/variants/:variantId/images', authenticate, isAdmin, addVariantImage);

// Delete image (admin)
router.delete('/images/:id', authenticate, isAdmin, deleteImage);

module.exports = router;
