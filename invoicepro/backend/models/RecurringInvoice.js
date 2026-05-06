const mongoose = require('mongoose');

const recurringInvoiceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    status: {
        type: String,
        enum: ['active', 'paused'],
        default: 'active',
        index: true
    },

    pauseReason: {
        type: String,
        default: ''
    },

    frequency: {
        type: String,
        enum: ['weekly', 'monthly'],
        required: true
    },

    interval: {
        type: Number,
        default: 1,
        min: 1,
        max: 24
    },

    dayOfMonth: {
        type: Number,
        min: 1,
        max: 31,
        default: null
    },

    startDate: {
        type: Date,
        required: true
    },

    nextRunAt: {
        type: Date,
        required: true,
        index: true
    },

    lastRunAt: {
        type: Date,
        default: null
    },

    runCount: {
        type: Number,
        default: 0,
        min: 0
    },

    maxRuns: {
        type: Number,
        default: null,
        min: 1
    },

    endDate: {
        type: Date,
        default: null
    },

    sendEmail: {
        type: Boolean,
        default: true
    },

    lastInvoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        default: null
    },

    createdFromInvoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        default: null
    },

    template: {
        clientName: { type: String, required: true, trim: true },
        clientEmail: { type: String, required: true, lowercase: true, trim: true },
        serviceDescription: { type: String, default: '' },
        items: [{
            name: { type: String, default: '' },
            price: { type: Number, default: 0 }
        }],
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, enum: ['INR', 'USD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD', 'CAD'], default: 'INR' },
        gst: { type: String, default: '' },
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        upiId: { type: String, default: '' },
        notes: { type: String, default: '' },
        dueDays: { type: Number, default: null, min: 0 }
    },

    lastError: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

recurringInvoiceSchema.index({ status: 1, nextRunAt: 1 });

module.exports = mongoose.model('RecurringInvoice', recurringInvoiceSchema);

