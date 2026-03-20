const express = require('express');
const router = express.Router();

const {
  upload,
  uploadImage,
  uploadImages,
  deleteCloudinaryImage,
  handleUploadError
} = require('../controllers/uploadController');

const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// All upload routes are admin only
router.use(authenticate, isAdmin);

// POST /api/upload/image
// Uploads a single image to Cloudinary.
// Returns the URL to be passed to POST /api/products/:id/images.
// upload.single('image') — multer processes the file field named 'image'
router.post(
  '/image',
  upload.single('image'),
  uploadImage,
  handleUploadError
);

// POST /api/upload/images
// Uploads up to 10 images in parallel.
// upload.array('images', 10) — multer processes the file field named 'images'
router.post(
  '/images',
  upload.array('images', 10),
  uploadImages,
  handleUploadError
);

// DELETE /api/upload/image/:publicId
// Deletes an image from Cloudinary by public_id.
// Call this alongside DELETE /api/products/images/:imageId
// to remove the file from Cloudinary and the DB reference in one flow.
router.delete(
  '/image/:publicId',
  deleteCloudinaryImage
);

module.exports = router;
