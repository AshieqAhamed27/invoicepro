const mongoose = require('mongoose');

const cloudDocumentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['invoice', 'proposal', 'contract', 'project', 'client', 'delivery', 'other'],
        default: 'other'
    },
    note: {
        type: String,
        default: '',
        trim: true
    },
    originalName: {
        type: String,
        default: '',
        trim: true
    },
    mimeType: {
        type: String,
        default: ''
    },
    bytes: {
        type: Number,
        default: 0
    },
    cloudinaryPublicId: {
        type: String,
        required: true
    },
    cloudinaryResourceType: {
        type: String,
        default: 'auto'
    },
    url: {
        type: String,
        required: true
    },
    secureUrl: {
        type: String,
        required: true
    },
    format: {
        type: String,
        default: ''
    },
    linkedType: {
        type: String,
        enum: ['none', 'invoice', 'client', 'project', 'lead'],
        default: 'none'
    },
    linkedId: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CloudDocument', cloudDocumentSchema);
