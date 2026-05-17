const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const {
    createRateLimiter,
    getSecurityConfig,
    rejectUnsafeMongoKeys,
    securityHeaders
} = require('./middleware/security');

const {
    getAllowedOrigins,
    getRequiredEnv,
    isAllowedOrigin,
    isDevOrigin,
    normalizeUrl
} = require('./utils/env');
const {
    PRICING_VERSION,
    getConnectionStateLabel,
    getEnvSanity,
    getIntegrationReadiness,
    getLaunchReadiness,
    markStartup,
    startupState
} = require('./utils/runtimeDiagnostics');

const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payment');
const aiRoutes = require('./routes/ai');
const clientRoutes = require('./routes/clients');
const leadRoutes = require('./routes/leads');
const businessGoalRoutes = require('./routes/businessGoal');
const teamProjectRoutes = require('./routes/teamProjects');
const agencyRoutes = require('./routes/agency');
const cloudDocumentRoutes = require('./routes/cloudDocuments');

const app = express();
const securityConfig = getSecurityConfig();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// ✅ CONNECT DATABASE
const connectDatabase = async() => {
    try {
        await mongoose.connect(getRequiredEnv('MONGO_URI'), { family: 4 });
        console.log("✅ Connected to MongoDB");
    } catch (err) {
        console.error("❌ MongoDB error:", err);
        process.exit(1);
    }
};

const startServer = async(options = {}) => {
    const port = options.port || process.env.PORT || 5000;
    const entrypoint = options.entrypoint || 'app.startServer';

    getRequiredEnv('JWT_SECRET');
    await connectDatabase();
    markStartup({ entrypoint, port });

    return new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
            console.log(`Server running on port ${port}`);
            resolve(server);
        });

        server.on('error', reject);
    });
};

// ✅ MIDDLEWARE
app.use(securityHeaders);
app.use(createRateLimiter({
    windowMs: securityConfig.generalWindowMs,
    max: securityConfig.generalMax,
    keyPrefix: 'api',
    message: 'Too many requests. Please slow down and try again.'
}));

app.use(
    cors({
        exposedHeaders: ['request-id', 'x-request-id', 'x-rtb-fingerprint-id'],
        origin: function(origin, callback) {
            if (!origin) return callback(null, true);

            const requestOrigin = normalizeUrl(origin);
            const allowedOrigins = getAllowedOrigins();

            if (isAllowedOrigin(requestOrigin) || isDevOrigin(requestOrigin)) {
                return callback(null, true);
            }

            const error = new Error(`Origin ${requestOrigin} is not allowed by CORS`);
            error.status = 403;
            error.context = { requestOrigin, allowedOrigins };
            return callback(error);
        },
        credentials: true
    })
);

app.use(express.json({
    limit: '5mb',
    verify: (req, res, buf) => {
        req.rawBody = buf.toString('utf8');
    }
}));

// ✅ ROUTES
app.use(rejectUnsafeMongoKeys);
app.use('/api/auth/login', createRateLimiter({
    windowMs: securityConfig.authWindowMs,
    max: securityConfig.authMax,
    keyPrefix: 'auth-login',
    message: 'Too many login attempts. Please wait and try again.'
}));
app.use('/api/auth/signup', createRateLimiter({
    windowMs: securityConfig.authWindowMs,
    max: securityConfig.authMax,
    keyPrefix: 'auth-signup',
    message: 'Too many signup attempts. Please wait and try again.'
}));
app.use('/api/auth/google', createRateLimiter({
    windowMs: securityConfig.authWindowMs,
    max: securityConfig.authMax,
    keyPrefix: 'auth-google',
    message: 'Too many Google login attempts. Please wait and try again.'
}));
app.use('/api/ai', createRateLimiter({
    windowMs: securityConfig.aiWindowMs,
    max: securityConfig.aiMax,
    keyPrefix: 'ai',
    message: 'Too many AI requests. Please wait and try again.'
}));
app.use('/api/payment', createRateLimiter({
    windowMs: securityConfig.paymentWindowMs,
    max: securityConfig.paymentMax,
    keyPrefix: 'payment',
    message: 'Too many payment requests. Please wait and try again.',
    skip: (req) => req.path === '/webhook'
}));
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/business-goal', businessGoalRoutes);
app.use('/api/team-projects', teamProjectRoutes);
app.use('/api/agency', agencyRoutes);
app.use('/api/cloud-documents', cloudDocumentRoutes);

app.get('/api', (req, res) => {
    res.json({
        status: 'OK',
        message: 'ClientFlow AI API is running',
        routes: {
            health: '/api/health',
            auth: '/api/auth',
            invoices: '/api/invoices',
            payment: '/api/payment',
            ai: '/api/ai',
            clients: '/api/clients',
            leads: '/api/leads',
            businessGoal: '/api/business-goal',
            teamProjects: '/api/team-projects',
            agency: '/api/agency',
            cloudDocuments: '/api/cloud-documents',
            codeRunnerStatus: '/api/team-projects/code-runner/status'
        }
    });
});

// ✅ HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'ClientFlow AI API is running'
    });
});

app.get('/api/health/details', (req, res) => {
    const databaseState = getConnectionStateLabel(mongoose.connection.readyState);

    res.json({
        status: 'OK',
        message: 'ClientFlow AI API diagnostics',
        pricingVersion: PRICING_VERSION,
        startup: {
            entrypoint: startupState.entrypoint,
            port: startupState.port,
            startedAt: startupState.startedAt,
            uptimeSeconds: Math.floor(process.uptime()),
            nodeVersion: process.version
        },
        database: {
            state: databaseState
        },
        envSanity: getEnvSanity(),
        integrationReadiness: getIntegrationReadiness(),
        readiness: getLaunchReadiness({ databaseState })
    });
});

app.get('/api/health/launch-readiness', (req, res) => {
    const databaseState = getConnectionStateLabel(mongoose.connection.readyState);

    res.json({
        status: 'OK',
        message: 'ClientFlow AI launch readiness',
        pricingVersion: PRICING_VERSION,
        database: {
            state: databaseState
        },
        envSanity: getEnvSanity(),
        integrationReadiness: getIntegrationReadiness(),
        readiness: getLaunchReadiness({ databaseState })
    });
});

// ✅ ERROR HANDLER
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    if (err.context) {
        console.error('Error context:', err.context);
    }
    const status = err.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';
    const message = !isProduction || status < 500
        ? (err.message || 'Server error')
        : 'Server error';

    res.status(status).json({
        message,
        requestId: req.requestId
    });
});

// Export app for local entrypoint / serverless environments.
app.connectDatabase = connectDatabase;
app.startServer = startServer;

module.exports = app;

if (require.main === module) {
    startServer({ entrypoint: 'server.js' }).catch((err) => {
        console.error('Server startup error:', err.message);
        process.exit(1);
    });
}
