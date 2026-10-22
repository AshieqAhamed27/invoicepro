const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resourceType: {
      type: String,
      enum: ['lead', 'invoice', 'client'],
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    resourceName: {
      type: String,
    },
    recipientEmail: {
      type: String,
    },
    recipientName: {
      type: String,
    },
    channel: {
      type: String,
      enum: ['email', 'whatsapp', 'manual'],
      default: 'email',
    },
    scheduledAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['scheduled', 'sent', 'failed', 'cancelled'],
      default: 'scheduled',
    },
    subject: {
      type: String,
    },
    message: {
      type: String,
    },
    tone: {
      type: String,
      enum: ['friendly', 'professional', 'firm'],
      default: 'professional',
    },
    aiGenerated: {
      type: Boolean,
      default: true,
    },
    editedByUser: {
      type: Boolean,
      default: false,
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

followUpSchema.index({ user: 1, status: 1, scheduledAt: 1 });
followUpSchema.index({ user: 1, resourceId: 1 });

module.exports = mongoose.model('FollowUp', followUpSchema);
