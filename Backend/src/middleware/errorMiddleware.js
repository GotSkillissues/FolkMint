// Error Middleware - Centralized error handler
// Must have 4 parameters (err, req, res, next) to be recognised by Express as error middleware

const errorHandler = (err, req, res, next) => {
  // Log the full error in dev, just the message in production
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${err.stack || err.message}`);
  } else {
    console.error(`[ERROR] ${err.message}`);
  }

  // JWT errors (from jsonwebtoken)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files. Maximum is 10 per request.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: `Unexpected field: ${err.field}` });
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        return res.status(409).json({ error: 'A record with this value already exists.' });
      case '23503': // foreign_key_violation
        return res.status(400).json({ error: 'Referenced record does not exist.' });
      case '23502': // not_null_violation
        return res.status(400).json({ error: `Missing required field: ${err.column || 'unknown'}` });
      case '22P02': // invalid_text_representation (e.g. bad UUID/int)
        return res.status(400).json({ error: 'Invalid data format in request.' });
      case '42P01': // undefined_table
        return res.status(500).json({ error: 'Database configuration error.' });
    }
  }

  // Express body-parser errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body.' });
  }

  // Rate limit errors (express-rate-limit passes through as regular errors too)
  if (err.status === 429) {
    return res.status(429).json({ error: err.message || 'Too many requests.' });
  }

  // Use the error's own status code if set, otherwise 500
  const status = err.status || err.statusCode || 500;
  const message = status < 500
    ? err.message
    : 'Something went wrong. Please try again later.';

  res.status(status).json({ error: message });
};

// 404 handler - catches any unmatched routes
const notFoundHandler = (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
};

module.exports = { errorHandler, notFoundHandler };
