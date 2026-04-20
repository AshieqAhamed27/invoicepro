const normalizeUrl = (url) => (url || '').trim().replace(/\/+$/, '');

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
    const extraOrigins = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map(normalizeUrl)
        .filter(Boolean);

    return new Set([frontendUrl, ...extraOrigins].filter(Boolean));
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
    isDevOrigin,
    normalizeUrl
};
