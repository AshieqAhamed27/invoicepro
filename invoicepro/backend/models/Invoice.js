const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    invoiceNumber: {
        type: String,
        required: true
    },

    documentType: {
        type: String,
        enum: ['invoice', 'proposal'],
        default: 'invoice'
    },

    clientName: {
        type: String,
        required: [true, 'Client name is required'],
        trim: true
    },

    clientEmail: {
        type: String,
        required: [true, 'Client email is required'],
        lowercase: true,
        trim: true
    },

    serviceDescription: {
        type: String,
        default: ''
    },

    items: [{
        name: {
            type: String,
            default: ''
        },
        price: {
            type: Number,
            default: 0
        }
    }],

    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: 0
    },

    currency: {
        type: String,
        enum: ['INR', 'USD'],
        default: 'INR'
    },

    gst: {
        type: String,
        default: ''
    },

    cgst: {
        type: Number,
        default: 0
    },

    sgst: {
        type: Number,
        default: 0
    },

    upiId: {
        type: String,
        default: ''
    },

    businessSnapshot: {
        name: {
            type: String,
            default: ''
        },
        email: {
            type: String,
            default: ''
        },
        address: {
            type: String,
            default: ''
        },
        gstNumber: {
            type: String,
            default: ''
        },
        upiId: {
            type: String,
            default: ''
        },
        logo: {
            type: String,
            default: ''
        }
    },

    date: {
        type: Date,
        default: Date.now
    },

    dueDate: {
        type: Date,
        default: null
    },

    validUntil: {
        type: Date,
        default: null
    },

    notes: {
        type: String,
        default: ''
    },

    proposalStatus: {
        type: String,
        enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
        default: null
    },

    proposalAcceptedAt: {
        type: Date,
        default: null
    },

    proposalRejectedAt: {
        type: Date,
        default: null
    },

    convertedAt: {
        type: Date,
        default: null
    },

    convertedToInvoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        default: null
    },

    sourceProposalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        default: null
    },

    sourceLeadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        default: null
    },

    // ✅ FIXED STATUS SYSTEM
    status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
    },

    // ✅ NEW: PAYMENT TRACKING
    paidAt: {
        type: Date,
        default: null
    },

    paymentPromise: {
        promisedDate: {
            type: Date,
            default: null
        },
        note: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            enum: ['open', 'kept', 'missed', 'cleared'],
            default: 'open'
        },
        updatedAt: {
            type: Date,
            default: null
        }
    }

}, {
    timestamps: true
});

invoiceSchema.index({ user: 1, createdAt: -1 });
invoiceSchema.index({ user: 1, status: 1 });
invoiceSchema.index({ user: 1, documentType: 1, createdAt: -1 });
invoiceSchema.index({ user: 1, sourceLeadId: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
