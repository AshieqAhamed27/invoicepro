const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payment');

const app = express();

// ==========================
// CORS
// ==========================
app.use(
    cors({
        origin: function(origin, callback) {
            if (!origin) return callback(null, true);

            if (
                origin.includes('vercel.app') ||
                origin.includes('localhost')
            ) {
                return callback(null, true);
            }

            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true
    })
);

// ==========================
// MIDDLEWARE
// ==========================
app.use(express.json({ limit: '5mb' })); // 🔥 increase limit

// ==========================
// STATIC FILES (IMPORTANT)
// ==========================
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================
// ROUTES
// ==========================
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payment', paymentRoutes);

// ==========================
// HEALTH CHECK
// ==========================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'InvoicePro API is running'
    });
});

// ==========================
// GLOBAL ERROR HANDLER 🔥
// ==========================
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);

    res.status(500).json({
        message: err.message || 'Server error'
    });
});

// ==========================
// PORT + DB
// ==========================
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// ==========================
// DB CONNECT
// ==========================
mongoose
    .connect(MONGO_URI, {
        family: 4
    })
    .then(() => {
        console.log('✅ Connected to MongoDB');

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });