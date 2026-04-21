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

            if (allowedOrigins.has(requestOrigin) || isDevOrigin(requestOrigin)) {
                return callback(null, true);
            }

            return callback(new Error('Not allowed by CORS'));
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
    res.status(500).json({
        message: err.message || 'Server error'
    });
});

// ✅ START SERVER (IMPORTANT FIX)
const PORT = process.env.PORT || 5000;

connectDatabase().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
});