const express = require('express');
const router = express.Router();
const {
  upload,
  uploadImage,
  uploadImages,
  deleteImage,
  handleUploadError
} = require('../controllers/uploadController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// Upload a single image (admin only)
router.post('/image', authenticate, isAdmin, upload.single('image'), handleUploadError, uploadImage);

// Upload multiple images (admin only)
router.post('/images', authenticate, isAdmin, upload.array('images', 10), handleUploadError, uploadImages);

// Delete an image by Cloudinary public_id (admin only)
router.delete('/image/:publicId', authenticate, isAdmin, deleteImage);
router.delete('/image', authenticate, isAdmin, deleteImage);

module.exports = router;
