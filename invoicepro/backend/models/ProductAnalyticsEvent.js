const mongoose = require('mongoose');

const productAnalyticsEventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
        index: true
    },
    visitorId: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    path: {
        type: String,
        trim: true,
        maxlength: 240,
        default: ''
    },
    title: {
        type: String,
        trim: true,
        maxlength: 160,
        default: ''
    },
    plan: {
        type: String,
        trim: true,
        maxlength: 40,
        default: ''
    },
    role: {
        type: String,
        trim: true,
        maxlength: 40,
        default: ''
    },
    referrer: {
        type: String,
        trim: true,
        maxlength: 300,
        default: ''
    },
    userAgent: {
        type: String,
        trim: true,
        maxlength: 300,
        default: ''
    }
}, {
    timestamps: true
});

productAnalyticsEventSchema.index({ createdAt: -1 });
productAnalyticsEventSchema.index({ eventName: 1, createdAt: -1 });
productAnalyticsEventSchema.index({ visitorId: 1, createdAt: -1 });

module.exports = mongoose.model('ProductAnalyticsEvent', productAnalyticsEventSchema);
