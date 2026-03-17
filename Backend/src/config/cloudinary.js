const cloudinary = require('cloudinary').v2;

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const isConfigured =
  Boolean(CLOUDINARY_CLOUD_NAME) &&
  Boolean(CLOUDINARY_API_KEY) &&
  Boolean(CLOUDINARY_API_SECRET);

if (isConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const ensureCloudinaryConfigured = () => {
  if (isConfigured) return;

  const missingVars = [
    ['CLOUDINARY_CLOUD_NAME', CLOUDINARY_CLOUD_NAME],
    ['CLOUDINARY_API_KEY', CLOUDINARY_API_KEY],
    ['CLOUDINARY_API_SECRET', CLOUDINARY_API_SECRET],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)
    .join(', ');

  const err = new Error(`Cloudinary is not configured. Missing: ${missingVars}`);
  err.statusCode = 500;
  throw err;
};

module.exports = {
  cloudinary,
  ensureCloudinaryConfigured,
};
