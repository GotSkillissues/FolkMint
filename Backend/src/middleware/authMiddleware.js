// Authentication middleware

const authenticate = (req, res, next) => {
  try {
    // TODO: Implement authentication logic
    // Check for token in headers
    // Verify token
    // Attach user to request
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      // TODO: Implement authorization logic
      // Check if user has required role
      next();
    } catch (error) {
      res.status(403).json({ error: 'Forbidden' });
    }
  };
};

module.exports = {
  authenticate,
  authorize
};
