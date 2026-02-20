// Upload Controller - Handle image file uploads to local disk
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer disk storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// File type filter - images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'), false);
  }
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10                   // max 10 files per request
  }
});

// Build the public URL for a stored file
const buildFileUrl = (req, filename) => {
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
};

// Upload a single image
// POST /api/upload/image
const uploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.status(201).json({
    message: 'Image uploaded successfully',
    image: {
      filename: req.file.filename,
      url: buildFileUrl(req, req.file.filename),
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
};

// Upload multiple images (up to 10)
// POST /api/upload/images
const uploadImages = (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const images = req.files.map(file => ({
    filename: file.filename,
    url: buildFileUrl(req, file.filename),
    size: file.size,
    mimetype: file.mimetype
  }));

  res.status(201).json({
    message: `${images.length} image(s) uploaded successfully`,
    images
  });
};

// Delete an image by filename
// DELETE /api/upload/image/:filename
const deleteImage = (req, res) => {
  const { filename } = req.params;

  // Prevent directory traversal attacks
  const safeFilename = path.basename(filename);
  const filePath = path.join(UPLOADS_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete file: ' + err.message });
    }
    res.status(200).json({ message: 'Image deleted successfully' });
  });
};

// Multer error handler middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 per request.' });
    }
    return res.status(400).json({ error: 'Upload error: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

module.exports = {
  upload,
  uploadImage,
  uploadImages,
  deleteImage,
  handleUploadError
};
