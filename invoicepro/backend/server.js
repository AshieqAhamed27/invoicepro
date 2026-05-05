const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

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

const app = express();

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
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/leads', leadRoutes);

app.get('/api', (req, res) => {
    res.json({
        status: 'OK',
        message: 'InvoicePro API is running',
        routes: {
            health: '/api/health',
            auth: '/api/auth',
            invoices: '/api/invoices',
            payment: '/api/payment',
            ai: '/api/ai',
            clients: '/api/clients',
            leads: '/api/leads'
        }
    });
});

// ✅ HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'InvoicePro API is running'
    });
});

app.get('/api/health/details', (req, res) => {
    const databaseState = getConnectionStateLabel(mongoose.connection.readyState);

    res.json({
        status: 'OK',
        message: 'InvoicePro API diagnostics',
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
        readiness: getLaunchReadiness({ databaseState })
    });
});

app.get('/api/health/launch-readiness', (req, res) => {
    const databaseState = getConnectionStateLabel(mongoose.connection.readyState);

    res.json({
        status: 'OK',
        message: 'InvoicePro launch readiness',
        pricingVersion: PRICING_VERSION,
        database: {
            state: databaseState
        },
        envSanity: getEnvSanity(),
        readiness: getLaunchReadiness({ databaseState })
    });
});

// ✅ ERROR HANDLER
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    if (err.context) {
        console.error('Error context:', err.context);
    }
    res.status(err.status || 500).json({
        message: err.message || 'Server error'
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
