const express = require('express');
const router = express.Router();

const {
  // Public
  getProducts,
  getProductById,
  getSimilarProducts,
  getYouMayAlsoLike,
  getTopRatedProducts,
  getPopularProducts,
  getRecommendedProducts,
  canReview,
  // Product CRUD
  createProduct,
  updateProduct,
  deleteProduct,
  // Variant CRUD
  getVariants,
  createVariant,
  updateVariant,
  deleteVariant,
  // Image CRUD
  getImages,
  addImage,
  setPrimaryImage,
  deleteImage
} = require('../controllers/productController');

const { authenticate, isAdmin, optionalAuth } = require('../middleware/authMiddleware');

// =====================================================================
// SPECIAL NAMED ROUTES
// All of these MUST come before /:id — otherwise Express matches
// 'top-rated', 'popular', 'recommended' as product IDs
// =====================================================================

// GET /api/products/top-rated
router.get('/top-rated', getTopRatedProducts);

// GET /api/products/popular
router.get('/popular', getPopularProducts);

// GET /api/products/recommended
// Authenticated — personalised by user signals, falls back to top rated
router.get('/recommended', authenticate, getRecommendedProducts);

// =====================================================================
// VARIANT ROUTES WITHOUT PRODUCT CONTEXT
// These use /variants/:variantId — must come before /:id
// to prevent 'variants' being matched as a product ID
// =====================================================================

// PATCH /api/products/variants/:variantId
router.patch('/variants/:variantId', authenticate, isAdmin, updateVariant);

// DELETE /api/products/variants/:variantId
router.delete('/variants/:variantId', authenticate, isAdmin, deleteVariant);

// =====================================================================
// IMAGE ROUTES WITHOUT PRODUCT CONTEXT
// These use /images/:imageId — must come before /:id
// =====================================================================

// PATCH /api/products/images/:imageId/primary
router.patch('/images/:imageId/primary', authenticate, isAdmin, setPrimaryImage);

// DELETE /api/products/images/:imageId
router.delete('/images/:imageId', authenticate, isAdmin, deleteImage);

// =====================================================================
// PRODUCT CRUD
// =====================================================================

// GET /api/products
// optionalAuth: if a valid admin JWT is present, req.user is populated
// so the controller can honour ?include_inactive=true for admin users.
router.get('/', optionalAuth, getProducts);

// POST /api/products
router.post('/', authenticate, isAdmin, createProduct);

// =====================================================================
// PRODUCT BY ID AND NESTED ROUTES
// All /:id routes come after all named routes above
// =====================================================================

// GET /api/products/:id
router.get('/:id', getProductById);

// PATCH /api/products/:id
router.patch('/:id', authenticate, isAdmin, updateProduct);

// DELETE /api/products/:id
router.delete('/:id', authenticate, isAdmin, deleteProduct);

// GET /api/products/:id/similar
router.get('/:id/similar', getSimilarProducts);

// GET /api/products/:id/you-may-also-like
router.get('/:id/you-may-also-like', getYouMayAlsoLike);

// GET /api/products/:id/can-review
// Authenticated
router.get('/:id/can-review', authenticate, canReview);

// =====================================================================
// VARIANT ROUTES WITH PRODUCT CONTEXT
// =====================================================================

// GET /api/products/:id/variants
router.get('/:id/variants', getVariants);

// POST /api/products/:id/variants
router.post('/:id/variants', authenticate, isAdmin, createVariant);

// =====================================================================
// IMAGE ROUTES WITH PRODUCT CONTEXT
// =====================================================================

// GET /api/products/:id/images
router.get('/:id/images', getImages);

// POST /api/products/:id/images
router.post('/:id/images', authenticate, isAdmin, addImage);

module.exports = router;