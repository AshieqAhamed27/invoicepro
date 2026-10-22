const mongoose = require('mongoose');

const reminderLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },
    type: {
      type: String,
      enum: ['due_soon_3d', 'due_today', 'overdue_3d', 'overdue_7d', 'overdue_14d', 'overdue_30d'],
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    recipientEmail: {
      type: String,
    },
    channel: {
      type: String,
      enum: ['email'],
      default: 'email',
    },
    success: {
      type: Boolean,
      default: true,
    },
    error: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Unique compound index to prevent duplicate reminders of the same type per invoice
reminderLogSchema.index({ invoiceId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('ReminderLog', reminderLogSchema);
