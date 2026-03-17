// Upload Controller - Handle image file uploads to Cloudinary
const multer = require('multer');
const { cloudinary, ensureCloudinaryConfigured } = require('../config/cloudinary');

// Multer memory storage config (file stays in memory before Cloudinary upload)
const storage = multer.memoryStorage();

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

const uploadBufferToCloudinary = (fileBuffer, mimetype) => {
  ensureCloudinaryConfigured();

  const folder = process.env.CLOUDINARY_FOLDER;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder || undefined,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

// Upload a single image
// POST /api/upload/image
const uploadImage = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const uploaded = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);

    res.status(201).json({
      message: 'Image uploaded successfully',
      image: {
        public_id: uploaded.public_id,
        filename: uploaded.public_id,
        url: uploaded.secure_url,
        size: uploaded.bytes,
        mimetype: req.file.mimetype,
      }
    });
  } catch (error) {
    next(error);
  }
};

// Upload multiple images (up to 10)
// POST /api/upload/images
const uploadImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  try {
    const images = await Promise.all(
      req.files.map(async (file) => {
        const uploaded = await uploadBufferToCloudinary(file.buffer, file.mimetype);
        return {
          public_id: uploaded.public_id,
          filename: uploaded.public_id,
          url: uploaded.secure_url,
          size: uploaded.bytes,
          mimetype: file.mimetype,
        };
      })
    );

    res.status(201).json({
      message: `${images.length} image(s) uploaded successfully`,
      images,
    });
  } catch (error) {
    next(error);
  }
};

// Delete an image by Cloudinary public_id
// DELETE /api/upload/image/:publicId or DELETE /api/upload/image with body { public_id }
const deleteImage = async (req, res, next) => {
  const publicId = req.params.publicId || req.body?.public_id;

  if (!publicId) {
    return res.status(400).json({ error: 'public_id is required' });
  }

  try {
    ensureCloudinaryConfigured();

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });

    if (result.result === 'not found') {
      return res.status(404).json({ error: 'Image not found in Cloudinary' });
    }

    res.status(200).json({
      message: 'Image deleted successfully',
      result,
    });
  } catch (error) {
    next(error);
  }
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
