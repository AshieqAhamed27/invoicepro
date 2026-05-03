const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    businessName: {
        type: String,
        default: '',
        trim: true
    },
    contactName: {
        type: String,
        default: '',
        trim: true
    },
    email: {
        type: String,
        default: '',
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        default: '',
        trim: true
    },
    website: {
        type: String,
        default: '',
        trim: true
    },
    linkedinUrl: {
        type: String,
        default: '',
        trim: true
    },
    instagramUrl: {
        type: String,
        default: '',
        trim: true
    },
    niche: {
        type: String,
        default: '',
        trim: true
    },
    pain: {
        type: String,
        default: '',
        trim: true
    },
    budget: {
        type: Number,
        default: 0,
        min: 0
    },
    urgency: {
        type: String,
        enum: ['low', 'normal', 'high'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['new', 'contacted', 'interested', 'proposal_sent', 'won', 'lost'],
        default: 'new'
    },
    fitScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    fitLabel: {
        type: String,
        default: 'New lead',
        trim: true
    },
    notes: {
        type: String,
        default: '',
        trim: true
    },
    source: {
        type: String,
        default: 'manual',
        trim: true
    },
    nextFollowUpAt: {
        type: Date,
        default: null
    },
    lastContactedAt: {
        type: Date,
        default: null
    },
    convertedClientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        default: null
    }
}, {
    timestamps: true
});

leadSchema.index({ user: 1, status: 1, updatedAt: -1 });
leadSchema.index({ user: 1, nextFollowUpAt: 1 });
leadSchema.index({ user: 1, email: 1 });

module.exports = mongoose.model('Lead', leadSchema);
