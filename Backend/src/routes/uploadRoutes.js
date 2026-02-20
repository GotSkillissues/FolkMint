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

// Delete an image by filename (admin only)
router.delete('/image/:filename', authenticate, isAdmin, deleteImage);

module.exports = router;
