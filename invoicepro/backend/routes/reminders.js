const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Invoice = require('../models/Invoice');
const ReminderLog = require('../models/ReminderLog');
const { protect } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// Helper: calculate days overdue (negative = still upcoming)
// ---------------------------------------------------------------------------
function getDaysOverdue(invoice) {
  const now = new Date();
  const due = new Date(invoice.dueDate);
  const diffMs = now - due;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Helper: build a smart, tone-escalating reminder message
// ---------------------------------------------------------------------------
function getSmartReminderMessage(invoice) {
  const daysOverdue = getDaysOverdue(invoice);
  const name = invoice.clientName || 'Client';
  const num = invoice._id.toString().slice(-6).toUpperCase();
  const currency = invoice.currency || 'USD';
  const amount = invoice.amount ? invoice.amount.toLocaleString() : '0';
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const payLink =
    invoice.paymentLink && invoice.paymentLink.shortUrl
      ? invoice.paymentLink.shortUrl
      : '';
  const payText = payLink ? ` [Pay Now: ${payLink}]` : '';

  if (daysOverdue <= 0) {
    return `Hi ${name}, just a friendly reminder that invoice #${num} for ${currency} ${amount} is due on ${dueDate}.${payText}`;
  }

  if (daysOverdue <= 7) {
    return (
      `Hi ${name}, your invoice #${num} for ${currency} ${amount} was due on ${dueDate}. ` +
      `Please process the payment at your earliest.${payText}`
    );
  }

  if (daysOverdue <= 14) {
    return (
      `Dear ${name}, invoice #${num} for ${currency} ${amount} is now ${daysOverdue} days overdue. ` +
      `Please make payment immediately or reply with an ETA.`
    );
  }

  return (
    `URGENT: Invoice #${num} for ${currency} ${amount} is ${daysOverdue} days overdue. ` +
    `Immediate payment required.${payText} Please contact us if there is an issue.`
  );
}

// ---------------------------------------------------------------------------
// Helper: build and return a nodemailer transporter (or null if not configured)
// ---------------------------------------------------------------------------
function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ---------------------------------------------------------------------------
// GET / — All reminder logs for invoices belonging to the authenticated user
// ---------------------------------------------------------------------------
router.get('/', protect, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    // Fetch invoices owned by the user to filter reminders
    const userInvoiceIds = await Invoice.find({ user: req.user._id }).distinct('_id');

    const [logs, total] = await Promise.all([
      ReminderLog.find({ invoiceId: { $in: userInvoiceIds } })
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('invoiceId', 'clientName amount currency status dueDate')
        .lean(),
      ReminderLog.countDocuments({ invoiceId: { $in: userInvoiceIds } }),
    ]);

    // Flatten invoice fields into each log for convenience
    const enriched = logs.map((log) => ({
      ...log,
      clientName: log.invoiceId ? log.invoiceId.clientName : null,
      amount: log.invoiceId ? log.invoiceId.amount : null,
      currency: log.invoiceId ? log.invoiceId.currency : null,
      invoiceStatus: log.invoiceId ? log.invoiceId.status : null,
    }));

    res.json({
      logs: enriched,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reminder logs', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /send-manual — Manually trigger a reminder for a specific invoice
// ---------------------------------------------------------------------------
router.post('/send-manual', protect, async (req, res) => {
  try {
    const { invoiceId, type, message } = req.body;

    if (!invoiceId || !type) {
      return res.status(400).json({ message: 'invoiceId and type are required' });
    }

    const validTypes = ['due_soon_3d', 'due_today', 'overdue_3d', 'overdue_7d', 'overdue_14d', 'overdue_30d'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${validTypes.join(', ')}` });
    }

    // 1. Find invoice owned by the authenticated user
    const invoice = await Invoice.findOne({ _id: invoiceId, user: req.user._id });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // 2. Only send reminders for pending invoices
    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Invoice is already paid — reminder not needed' });
    }

    // 3. Build email body
    const emailBody = message && message.trim() ? message.trim() : getSmartReminderMessage(invoice);

    const invoiceNum = invoice._id.toString().slice(-6).toUpperCase();
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@clientflow.ai',
      to: invoice.clientEmail,
      subject: `Payment Reminder: Invoice #${invoiceNum}`,
      text: emailBody,
      html: `<p style="font-family:sans-serif;font-size:15px;line-height:1.6;">${emailBody.replace(/\n/g, '<br/>')}</p>`,
    };

    // 4. Send or simulate
    const transporter = getTransporter();
    let sendSuccess = true;
    let sendError = '';

    if (transporter) {
      try {
        await transporter.sendMail(mailOptions);
      } catch (mailErr) {
        sendSuccess = false;
        sendError = mailErr.message;
      }
    } else {
      // Simulate — log to console in dev
      console.log('[ReminderSimulated] To:', mailOptions.to, '| Subject:', mailOptions.subject);
      console.log('[ReminderSimulated] Body:', emailBody);
    }

    // 5. Save reminder log (upsert to respect unique index gracefully)
    let reminderLog;
    try {
      reminderLog = await ReminderLog.findOneAndUpdate(
        { invoiceId: invoice._id, type },
        {
          user: req.user._id,
          invoiceId: invoice._id,
          type,
          sentAt: new Date(),
          recipientEmail: invoice.clientEmail,
          channel: 'email',
          success: sendSuccess,
          error: sendError,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (dbErr) {
      // Non-fatal — reminder was sent but logging failed
      console.error('[ReminderLog] Failed to save log:', dbErr.message);
    }

    res.json({
      sent: true,
      simulated: !transporter,
      reminderLog,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send reminder', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /stats — Reminder & invoice health stats for the authenticated user
// ---------------------------------------------------------------------------
router.get('/stats', protect, async (req, res) => {
  try {
    const now = new Date();

    const userInvoiceIds = await Invoice.find({ user: req.user._id }).distinct('_id');

    const [totalSent, pendingInvoices, overdueResult] = await Promise.all([
      // Total reminders sent
      ReminderLog.countDocuments({ invoiceId: { $in: userInvoiceIds } }),

      // Invoices still pending (not yet overdue or today)
      Invoice.countDocuments({
        user: req.user._id,
        status: 'pending',
        dueDate: { $gte: now },
      }),

      // Overdue invoices aggregate
      Invoice.aggregate([
        {
          $match: {
            user: req.user._id,
            status: 'pending',
            dueDate: { $lt: now },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const overdueData = overdueResult[0] || { count: 0, totalAmount: 0 };

    res.json({
      totalSent,
      pendingInvoices,
      overdueInvoices: overdueData.count,
      totalOverdueAmount: overdueData.totalAmount,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reminder stats', error: err.message });
  }
});

module.exports = router;
