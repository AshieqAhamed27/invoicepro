const { getAllowedOrigins, normalizeUrl } = require('./env');

const PRICING_VERSION = '2026-04-22';

const startupState = {
    entrypoint: 'not-started',
    port: null,
    startedAt: null
};

const CONNECTION_STATES = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
};

const hasValue = (name) => Boolean(process.env[name]);

const markStartup = ({ entrypoint, port }) => {
    startupState.entrypoint = entrypoint || 'unknown';
    startupState.port = String(port || process.env.PORT || 5000);
    startupState.startedAt = new Date().toISOString();
};

const getEnvSanity = () => {
    const allowedOrigins = getAllowedOrigins();

    return {
        required: {
            mongoUri: hasValue('MONGO_URI'),
            jwtSecret: hasValue('JWT_SECRET'),
            frontendUrl: hasValue('FRONTEND_URL')
        },
        payments: {
            simulationEnabled: process.env.PAYMENT_SIMULATION === 'true',
            razorpayKeyId: hasValue('RAZORPAY_KEY_ID'),
            razorpayKeySecret: hasValue('RAZORPAY_KEY_SECRET'),
            razorpayWebhookSecret: hasValue('RAZORPAY_WEBHOOK_SECRET')
        },
        recurring: {
            cronSecret: hasValue('CRON_SECRET')
        },
        cors: {
            frontendUrl: normalizeUrl(process.env.FRONTEND_URL) || null,
            configuredOrigins: allowedOrigins,
            wildcardOrigins: allowedOrigins.filter((origin) => origin.includes('*')),
            allowedOriginCount: allowedOrigins.length
        }
    };
};

const getConnectionStateLabel = (readyState) => CONNECTION_STATES[readyState] || 'unknown';

module.exports = {
    PRICING_VERSION,
    getConnectionStateLabel,
    getEnvSanity,
    markStartup,
    startupState
};
