const crypto = require('crypto');

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getClientIp = (req) =>
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

const securityHeaders = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = requestId;

    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

    next();
};

const rateLimitStores = new Map();

const createRateLimiter = ({
    windowMs = 15 * 60 * 1000,
    max = 300,
    keyPrefix = 'global',
    message = 'Too many requests. Please wait and try again.',
    skip = () => false
} = {}) => {
    const store = new Map();
    rateLimitStores.set(keyPrefix, store);

    return (req, res, next) => {
        if (skip(req)) return next();

        const now = Date.now();
        const key = `${keyPrefix}:${getClientIp(req)}`;
        const current = store.get(key);

        if (!current || current.resetAt <= now) {
            store.set(key, {
                count: 1,
                resetAt: now + windowMs
            });
            res.setHeader('RateLimit-Limit', String(max));
            res.setHeader('RateLimit-Remaining', String(Math.max(max - 1, 0)));
            return next();
        }

        current.count += 1;
        const remaining = Math.max(max - current.count, 0);
        const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);

        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', String(remaining));
        res.setHeader('RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));

        if (current.count > max) {
            res.setHeader('Retry-After', String(retryAfterSeconds));
            return res.status(429).json({
                message,
                retryAfterSeconds
            });
        }

        next();
    };
};

const hasUnsafeKey = (value, depth = 0) => {
    if (!value || typeof value !== 'object') return false;
    if (depth > 12) return true;

    if (Array.isArray(value)) {
        return value.some((item) => hasUnsafeKey(item, depth + 1));
    }

    return Object.keys(value).some((key) => (
        key.startsWith('$') ||
        key.includes('.') ||
        hasUnsafeKey(value[key], depth + 1)
    ));
};

const rejectUnsafeMongoKeys = (req, res, next) => {
    if (
        hasUnsafeKey(req.body) ||
        hasUnsafeKey(req.query) ||
        hasUnsafeKey(req.params)
    ) {
        return res.status(400).json({
            message: 'Invalid request payload.'
        });
    }

    next();
};

const getSecurityConfig = () => ({
    generalWindowMs: parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    generalMax: parsePositiveInt(process.env.RATE_LIMIT_MAX, 300),
    authWindowMs: parsePositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    authMax: parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 25),
    aiWindowMs: parsePositiveInt(process.env.AI_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
    aiMax: parsePositiveInt(process.env.AI_RATE_LIMIT_MAX, 80),
    paymentWindowMs: parsePositiveInt(process.env.PAYMENT_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    paymentMax: parsePositiveInt(process.env.PAYMENT_RATE_LIMIT_MAX, 80)
});

module.exports = {
    createRateLimiter,
    getSecurityConfig,
    rejectUnsafeMongoKeys,
    securityHeaders
};
