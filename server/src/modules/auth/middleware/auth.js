/**
 * Authentication middleware.
 * Validates the Bearer token from the Authorization header.
 * Replace the stub verification logic with jwt.verify() using your JWT_SECRET.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // TODO: Replace with real JWT verification, e.g.:
    // const decoded = jwt.verify(token, environment.jwtSecret);
    // req.user = decoded;
    req.user = { id: 'test-user-id', role: 'user' }; // Stub for development
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = authMiddleware;
