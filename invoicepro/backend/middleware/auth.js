const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../utils/env');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized. No token.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());

    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    next();
  } catch (err) {
    const expired = err?.name === 'TokenExpiredError';
    return res.status(401).json({
      message: expired ? 'Session expired. Please login again.' : 'Token invalid. Please login again.',
      code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
    });
  }
};

module.exports = { protect };
