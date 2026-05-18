const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved'],
        default: 'pending'
    },
    screenshot: {
        type: String
    },
    screenshotName: {
        type: String,
        default: ''
    },
    screenshotContentType: {
        type: String,
        default: ''
    },
    screenshotSize: {
        type: Number,
        default: 0
    },
    screenshotData: {
        type: Buffer,
        select: false
    },
    plan: {
        type: String,
        default: 'monthly'
    },
    amount: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'INR'
    },
    approvedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);
