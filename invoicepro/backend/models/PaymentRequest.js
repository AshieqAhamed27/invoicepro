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
    }
}, { timestamps: true });

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);
