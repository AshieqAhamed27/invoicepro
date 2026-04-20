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
    plan: {
        type: String,
        default: 'monthly'
    }
}, { timestamps: true });

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);