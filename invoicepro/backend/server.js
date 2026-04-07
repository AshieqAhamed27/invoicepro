const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payment'); // ✅ ADD THIS

const app = express();

// ✅ CORS setup
app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);

        if (
            origin.includes("vercel.app") ||
            origin.includes("localhost")
        ) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));

app.use('/uploads', express.static('uploads'));
// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payment', paymentRoutes); // ✅ ADD THIS

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'InvoicePro API is running' });
});

// Port
const PORT = process.env.PORT || 5000;

// MongoDB URI
const MONGO_URI = process.env.MONGO_URI;

// DB connect
mongoose.connect(MONGO_URI, {
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