// Security Middleware - HTTP security headers via helmet
const helmet = require('helmet');

// Content Security Policy for API (no browser rendering, just REST)
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow /uploads to be fetched from frontend
  referrerPolicy: { policy: 'no-referrer' }
});

module.exports = { securityHeaders };
