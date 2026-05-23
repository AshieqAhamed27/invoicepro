const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    channel: {
        type: String,
        enum: ['email'],
        default: 'email',
        index: true
    },
    type: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
        index: true
    },
    recipientEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        maxlength: 160,
        index: true
    },
    resourceType: {
        type: String,
        default: '',
        trim: true,
        maxlength: 80
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        index: true
    },
    cadenceKey: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'skipped'],
        default: 'pending'
    },
    error: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500
    },
    sentAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

notificationLogSchema.index(
    { channel: 1, type: 1, recipientEmail: 1, resourceId: 1, cadenceKey: 1 },
    { unique: true }
);
notificationLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
