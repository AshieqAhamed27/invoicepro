const mongoose = require('mongoose');

const billingSubscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    provider: {
        type: String,
        enum: ['razorpay'],
        default: 'razorpay'
    },

    providerSubscriptionId: {
        type: String,
        index: true,
        unique: true,
        sparse: true
    },

    providerPlanId: {
        type: String,
        default: ''
    },

    plan: {
        type: String,
        enum: ['monthly', 'yearly'],
        required: true
    },

    amount: {
        type: Number,
        default: 0
    },

    currency: {
        type: String,
        default: 'INR'
    },

    status: {
        type: String,
        default: 'created',
        index: true
    },

    currentStart: {
        type: Date,
        default: null
    },

    currentEnd: {
        type: Date,
        default: null
    },

    chargeAt: {
        type: Date,
        default: null
    },

    endedAt: {
        type: Date,
        default: null
    },

    totalCount: {
        type: Number,
        default: null
    },

    paidCount: {
        type: Number,
        default: 0
    },

    remainingCount: {
        type: Number,
        default: null
    },

    customerId: {
        type: String,
        default: ''
    },

    shortUrl: {
        type: String,
        default: ''
    },

    lastPaymentId: {
        type: String,
        default: ''
    },

    latestEvent: {
        type: String,
        default: ''
    },

    raw: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, {
    timestamps: true
});

billingSubscriptionSchema.index({ user: 1, createdAt: -1 });
billingSubscriptionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('BillingSubscription', billingSubscriptionSchema);
