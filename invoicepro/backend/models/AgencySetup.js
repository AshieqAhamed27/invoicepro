const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true
    },
    label: {
        type: String,
        required: true
    },
    done: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String,
        default: ''
    },
    completedAt: {
        type: Date,
        default: null
    }
}, { _id: false });

const agencySetupSchema = new mongoose.Schema({
    packageId: {
        type: String,
        required: true
    },
    packageName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    workflowType: {
        type: String,
        enum: ['freelancers', 'developers', 'designers', 'agencies', 'consultants'],
        default: 'freelancers'
    },
    customerName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    whatsapp: {
        type: String,
        required: true
    },
    skill: {
        type: String,
        required: true
    },
    problem: {
        type: String,
        required: true
    },
    targetClient: {
        type: String,
        default: ''
    },
    incomeGoal: {
        type: String,
        default: ''
    },
    portfolioUrl: {
        type: String,
        default: ''
    },
    preferredPlatform: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['payment_pending', 'paid', 'in_progress', 'delivered', 'cancelled', 'refunded'],
        default: 'payment_pending'
    },
    payment: {
        provider: {
            type: String,
            default: 'razorpay'
        },
        providerOrderId: {
            type: String,
            default: ''
        },
        providerPaymentId: {
            type: String,
            default: ''
        },
        providerSignature: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            default: 'pending'
        },
        paidAt: {
            type: Date,
            default: null
        },
        raw: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        }
    },
    deliveryChecklist: {
        type: [checklistItemSchema],
        default: []
    },
    source: {
        type: String,
        default: 'agency_page'
    }
}, { timestamps: true });

module.exports = mongoose.model('AgencySetup', agencySetupSchema);
