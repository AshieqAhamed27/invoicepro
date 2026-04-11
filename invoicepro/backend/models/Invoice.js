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

    date: {
        type: Date,
        required: [true, 'Date is required']
    },

    dueDate: {
        type: Date
    },

    notes: {
        type: String,
        default: ''
    },

    status: {
        type: String,
        enum: ['draft', 'sent', 'paid'],
        default: 'draft'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Invoice', invoiceSchema);