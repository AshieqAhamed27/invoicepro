const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../utils/env');

const DEFAULT_ADMIN_EMAILS = ['ashieqahamed4@gmail.com'];
const FREE_FULL_ACCESS_ENABLED = String(process.env.FREE_FULL_ACCESS_ENABLED ?? 'true').toLowerCase() !== 'false';
const FREE_FULL_ACCESS_DAYS = Math.max(1, Number.parseInt(process.env.FREE_FULL_ACCESS_DAYS || '30', 10) || 30);
const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const getAdminEmails = () => {
  const configured = String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);

  return new Set([...DEFAULT_ADMIN_EMAILS, ...configured]);
};

const isAdminEmail = (email) => getAdminEmails().has(normalizeEmail(email));

const syncAdminRole = async (user) => {
  if (!user || !isAdminEmail(user.email) || user.role === 'admin') {
    return user;
  }

  user.role = 'admin';
  await user.save();
  return user;
};

const hasCurrentPaidPlan = (user) => {
  if (!user || !user.plan || user.plan === 'free') return false;

  if (user.planExpiresAt) {
    const expiresAt = new Date(user.planExpiresAt);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt <= new Date()) {
      return false;
    }
  }

  return true;
};

const getFreeAccessState = (user) => {
  const startedAt = user?.freeAccessStartedAt ? new Date(user.freeAccessStartedAt) : null;
  const configuredExpiry = user?.freeAccessExpiresAt ? new Date(user.freeAccessExpiresAt) : null;
  const validStart = startedAt && !Number.isNaN(startedAt.getTime()) ? startedAt : null;
  const expiresAt = configuredExpiry && !Number.isNaN(configuredExpiry.getTime())
    ? configuredExpiry
    : validStart
      ? new Date(validStart.getTime() + FREE_FULL_ACCESS_DAYS * DAY_MS)
      : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS) : 0;

  return {
    enabled: FREE_FULL_ACCESS_ENABLED,
    days: FREE_FULL_ACCESS_DAYS,
    startedAt: validStart,
    expiresAt,
    active: Boolean(FREE_FULL_ACCESS_ENABLED && validStart && expiresAt && expiresAt > new Date()),
    expired: Boolean(FREE_FULL_ACCESS_ENABLED && expiresAt && expiresAt <= new Date()),
    daysLeft: Math.max(daysLeft, 0)
  };
};

const ensureFreeAccessWindow = async (user) => {
  if (!FREE_FULL_ACCESS_ENABLED || !user || user.role === 'admin' || hasCurrentPaidPlan(user)) {
    return user;
  }

  const currentState = getFreeAccessState(user);

  if (currentState.startedAt && currentState.expiresAt) {
    return user;
  }

  const startedAt = currentState.startedAt || new Date();
  user.freeAccessStartedAt = startedAt;
  user.freeAccessExpiresAt = currentState.expiresAt || new Date(startedAt.getTime() + FREE_FULL_ACCESS_DAYS * DAY_MS);
  await user.save();
  return user;
};

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

    await syncAdminRole(req.user);

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

    await ensureFreeAccessWindow(req.user);

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
  if (hasCurrentPaidPlan(user)) return true;
  return getFreeAccessState(user).active;
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

const isFreeFullAccessEnabled = () => FREE_FULL_ACCESS_ENABLED;

module.exports = {
  ensureFreeAccessWindow,
  getFreeAccessState,
  protect,
  requirePro,
  hasPaidPlan,
  isAdminEmail,
  isFreeFullAccessEnabled,
  syncAdminRole
};
