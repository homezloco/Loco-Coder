const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate WebSocket connections
 * @param {Object} req - The HTTP request object
 * @param {string} token - The JWT token from the WebSocket connection
 * @returns {Promise<Object>} - The decoded token if valid
 * @throws {Error} - If authentication fails
 */
async function authenticateWebSocket(req, token) {
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // You can add additional validation here, like checking if the user exists in the database
    // const user = await User.findById(decoded.userId);
    // if (!user) {
    //   throw new Error('User not found');
    // }
    
    return decoded;
  } catch (error) {
    logger.error('WebSocket authentication error:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Middleware to authenticate HTTP requests
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @param {Function} next - The next middleware function
 */
const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Token is not valid' });
  }
};

module.exports = {
  authenticateWebSocket,
  authenticate
};
