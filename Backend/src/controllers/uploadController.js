const multer = require('multer');
const { cloudinary, ensureCloudinaryConfigured } = require('../config/cloudinary');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]);

const MAX_FILE_SIZE    = 5 * 1024 * 1024; // 5MB
const MAX_FILE_COUNT   = 10;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files:    MAX_FILE_COUNT
  }
});

// Uploads a buffer to Cloudinary and returns the result.
// All uploads go to the folder defined in CLOUDINARY_FOLDER env var.
const uploadBufferToCloudinary = (buffer) => {
  ensureCloudinaryConfigured();

  const folder = process.env.CLOUDINARY_FOLDER || undefined;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

const buildImageResponse = (uploaded, mimetype) => ({
  public_id: uploaded.public_id,
  url:       uploaded.secure_url,
  width:     uploaded.width,
  height:    uploaded.height,
  size:      uploaded.bytes,
  mimetype
});

// POST /api/upload/image
// Admin only. Uploads a single image to Cloudinary.
// Returns the Cloudinary URL to be passed to POST /api/products/:id/images.
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploaded = await uploadBufferToCloudinary(req.file.buffer);

    return res.status(201).json({
      message: 'Image uploaded successfully',
      image:   buildImageResponse(uploaded, req.file.mimetype)
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/upload/images
// Admin only. Uploads multiple images (up to 10) to Cloudinary in parallel.
// Returns array of Cloudinary URLs.
const uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const images = await Promise.all(
      req.files.map(async (file) => {
        const uploaded = await uploadBufferToCloudinary(file.buffer);
        return buildImageResponse(uploaded, file.mimetype);
      })
    );

    return res.status(201).json({
      message: `${images.length} image(s) uploaded successfully`,
      images
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/upload/image/:publicId
// Admin only. Deletes an image from Cloudinary by its public_id.
// Call this when deleting a product image to avoid orphaned files in Cloudinary.
const deleteCloudinaryImage = async (req, res, next) => {
  try {
    ensureCloudinaryConfigured();

    const publicId = req.params.publicId || String(req.body?.public_id || '').trim();

    if (!publicId) {
      return res.status(400).json({ error: 'public_id is required' });
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image'
    });

    if (result.result === 'not found') {
      return res.status(404).json({ error: 'Image not found in Cloudinary' });
    }

    return res.status(200).json({
      message: 'Image deleted from Cloudinary',
      result
    });
  } catch (error) {
    next(error);
  }
};

// Multer error handler middleware.
// Must be registered after the upload middleware in the route.
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: `Too many files. Maximum is ${MAX_FILE_COUNT} per request.` });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
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
  deleteCloudinaryImage,
  handleUploadError
};