const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const {
    getAllowedOrigins,
    getRequiredEnv,
    isDevOrigin,
    normalizeUrl
} = require('./utils/env');

const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payment');
const aiRoutes = require('./routes/ai');
const clientRoutes = require('./routes/clients');

const app = express();
let mongoConnectionPromise = null;

const connectDatabase = async() => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!mongoConnectionPromise) {
        mongoConnectionPromise = mongoose
            .connect(getRequiredEnv('MONGO_URI'), {
                family: 4
            })
            .catch((err) => {
                mongoConnectionPromise = null;
                throw err;
            });
    }

    await mongoConnectionPromise;
    return mongoose.connection;
};

app.use(
    cors({
        origin: function(origin, callback) {
            if (!origin) return callback(null, true);

            const requestOrigin = normalizeUrl(origin);
            const allowedOrigins = getAllowedOrigins();

            if (allowedOrigins.has(requestOrigin) || isDevOrigin(requestOrigin)) {
                return callback(null, true);
            }

            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true
    })
);

app.use(express.json({ limit: '5mb' }));

app.use(async(req, res, next) => {
    try {
        await connectDatabase();
        next();
    } catch (err) {
        next(err);
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/clients', clientRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'InvoicePro API is running'
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);

    res.status(500).json({
        message: err.message || 'Server error'
    });
});

module.exports = app;
module.exports.connectDatabase = connectDatabase;
