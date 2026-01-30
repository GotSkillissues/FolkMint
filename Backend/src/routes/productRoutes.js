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
router.post('/', createProduct);

// Update product (admin)
router.put('/:id', updateProduct);

// Delete product (admin)
router.delete('/:id', deleteProduct);

// ==================== VARIANT ROUTES ====================
// Get variants for a product
router.get('/:productId/variants', getProductVariants);

// Create variant for a product
router.post('/:productId/variants', createVariant);

// ==================== VARIANT BY ID (separate router) ====================
// These are handled via /api/variants routes, but we can also access via products
router.put('/variants/:id', updateVariant);
router.patch('/variants/:id/stock', updateVariantStock);
router.delete('/variants/:id', deleteVariant);

// ==================== IMAGE ROUTES ====================
// Add image to variant
router.post('/variants/:variantId/images', addVariantImage);

// Delete image
router.delete('/images/:id', deleteImage);

module.exports = router;
