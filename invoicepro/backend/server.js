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

const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payment');
const aiRoutes = require('./routes/ai');
const clientRoutes = require('./routes/clients');

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

// ✅ MIDDLEWARE
app.use(
    cors({
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

app.use(express.json({ limit: '5mb' }));

// ✅ ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/clients', clientRoutes);

// ✅ HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'InvoicePro API is running'
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

module.exports = app;
