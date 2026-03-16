// Rate Limit Middleware
// Protects endpoints from brute force and abuse
const rateLimit = require('express-rate-limit');

// Generic message helper
const rateLimitMessage = (type) => ({
  error: `Too many ${type} attempts. Please try again later.`
});

const isPublicCatalogRead = (req) => {
  const isRead = req.method === 'GET';
  const isCatalogPath = req.path.startsWith('/products') || req.path.startsWith('/categories');
  return isRead && isCatalogPath;
};

// Auth endpoints (login, register) - strict: 10 requests per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('login/register'),
  skipSuccessfulRequests: true  // Only count failed attempts
});

// General API - 100 requests per 15 min per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('API'),
  skip: isPublicCatalogRead,
});

// Upload endpoint - 20 uploads per hour
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('upload')
});

// Password reset / sensitive actions - 5 per hour
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('sensitive action')
});

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter,
  sensitiveLimiter
};
