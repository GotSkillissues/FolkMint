const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}

const mapUserFromToken = (decoded) => ({
  userId: decoded.userId,
  email:  decoded.email,
  role:   decoded.role
});

// Requires a valid Bearer token.
// Attaches req.user = { userId, email, role } on success.
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = mapUserFromToken(decoded);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based authorization factory.
// Usage: authorize('admin') or authorize('admin', 'moderator')
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
};

// Shorthand for authorize('admin')
const isAdmin = (req, res, next) => authorize('admin')(req, res, next);

// Does not require a token but attaches req.user if a valid one is present.
// Used for endpoints that behave differently for guests vs logged-in users.
const optionalAuth = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = mapUserFromToken(decoded);
    }
  } catch (_error) {
    // Ignore invalid or expired optional tokens — continue as guest
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  isAdmin,
  optionalAuth
};