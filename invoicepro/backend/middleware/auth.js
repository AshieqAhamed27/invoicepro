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

    const expiresAt = req.user.planExpiresAt ? new Date(req.user.planExpiresAt) : null;
    const canExpireLocally = ['trial', 'one_time_payment', 'manual_approval', 'webhook_payment'].includes(req.user.subscriptionStatus);

    if (
      req.user.plan &&
      req.user.plan !== 'free' &&
      expiresAt &&
      expiresAt <= new Date() &&
      canExpireLocally
    ) {
      req.user.plan = 'free';
      req.user.planExpiresAt = null;
      req.user.subscriptionStatus = 'expired';
      await req.user.save();
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

const hasPaidPlan = (user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!user.plan || user.plan === 'free') return false;

  if (user.planExpiresAt) {
    const expiresAt = new Date(user.planExpiresAt);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt <= new Date()) {
      return false;
    }
  }

  return true;
};

const requirePro = (req, res, next) => {
  if (!hasPaidPlan(req.user)) {
    return res.status(402).json({
      message: 'Upgrade Pro to unlock this feature.',
      upgradeRequired: true,
      feature: req.originalUrl
    });
  }

  next();
};

module.exports = { protect, requirePro, hasPaidPlan };
