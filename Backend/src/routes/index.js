const express = require('express');
const router = express.Router();

const authRoutes           = require('./authRoutes');
const userRoutes           = require('./userRoutes');
const addressRoutes        = require('./addressRoutes');
const categoryRoutes       = require('./categoryRoutes');
const productRoutes        = require('./productRoutes');
const cartRoutes           = require('./cartRoutes');
const orderRoutes          = require('./orderRoutes');
const paymentMethodRoutes  = require('./paymentMethodRoutes');
const paymentRoutes        = require('./paymentRoutes');
const reviewRoutes         = require('./reviewRoutes');
const wishlistRoutes       = require('./wishlistRoutes');
const notificationRoutes   = require('./notificationRoutes');
const analyticsRoutes      = require('./analyticsRoutes');
const uploadRoutes         = require('./uploadRoutes');

router.use('/auth',            authRoutes);
router.use('/users',           userRoutes);
router.use('/addresses',       addressRoutes);
router.use('/categories',      categoryRoutes);
router.use('/products',        productRoutes);
router.use('/cart',            cartRoutes);
router.use('/orders',          orderRoutes);
router.use('/payment-methods', paymentMethodRoutes);
router.use('/payments',        paymentRoutes);
router.use('/reviews',         reviewRoutes);
router.use('/wishlist',        wishlistRoutes);
router.use('/notifications',   notificationRoutes);
router.use('/analytics',       analyticsRoutes);
router.use('/upload',          uploadRoutes);

module.exports = router;