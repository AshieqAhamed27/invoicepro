const normalizeUrl = (url) => (url || '').trim().replace(/\/+$/, '');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseOrigins = (value) => {
    return (value || '')
        .split(',')
        .map(normalizeUrl)
        .filter(Boolean);
};

const toOriginPattern = (origin) => {
    return new RegExp(`^${escapeRegExp(origin).replace(/\\\*/g, '.*')}$`);
};

const getRequiredEnv = (name) => {
    const value = process.env[name];

    if (!value) {
        throw new Error(`${name} is required`);
    }

    return value;
};

const getJwtSecret = () => getRequiredEnv('JWT_SECRET');

const getAllowedOrigins = () => {
    const frontendUrl = normalizeUrl(process.env.FRONTEND_URL);
    return [frontendUrl, ...parseOrigins(process.env.CORS_ORIGINS)].filter(Boolean);
};

const isAllowedOrigin = (origin) => {
    const requestOrigin = normalizeUrl(origin);
    if (!requestOrigin) return true;

    return getAllowedOrigins().some((allowedOrigin) => {
        if (allowedOrigin.includes('*')) {
            return toOriginPattern(allowedOrigin).test(requestOrigin);
        }

        return allowedOrigin === requestOrigin;
    });
};

const isDevOrigin = (origin) => {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
        /^http:\/\/172\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
        /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin);
};

module.exports = {
    getAllowedOrigins,
    getJwtSecret,
    getRequiredEnv,
    isAllowedOrigin,
    isDevOrigin,
    normalizeUrl
};
