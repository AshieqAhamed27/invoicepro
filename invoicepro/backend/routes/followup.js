const express = require('express');
const https = require('https');
const nodemailer = require('nodemailer');
const router = express.Router();

const { protect } = require('../middleware/auth');
const FollowUp = require('../models/FollowUp');
const Lead = require('../models/Lead');
const Invoice = require('../models/Invoice');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Call OpenAI chat completions via the built-in https module (no axios / sdk).
 * Resolves with the assistant message string, or rejects on network / API error.
 */
function callOpenAI(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return reject(new Error('OPENAI_API_KEY not set'));
    }

    const body = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            return reject(new Error(parsed.error.message || 'OpenAI API error'));
          }
          const message =
            parsed.choices &&
            parsed.choices[0] &&
            parsed.choices[0].message &&
            parsed.choices[0].message.content;
          if (!message) {
            return reject(new Error('Unexpected OpenAI response structure'));
          }
          resolve(message.trim());
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Build system + user prompts for a lead follow-up.
 */
function buildLeadPrompts(lead, tone, channel) {
  const lastContacted = lead.lastContactedAt
    ? new Date(lead.lastContactedAt).toDateString()
    : 'not yet';

  const systemPrompt =
    'You are a professional sales assistant for an Indian freelancer. ' +
    'Write a short, warm follow-up message to a potential client. ' +
    'Be genuine, not salesy. Max 120 words.';

  const channelLabel = channel === 'whatsapp' ? 'WhatsApp message' : 'email';

  const userPrompt =
    `Write a ${tone} follow-up ${channelLabel} for:\n` +
    `- Client: ${lead.contactName || 'the client'} from ${lead.businessName || 'their company'}\n` +
    `- Their niche: ${lead.niche || 'not specified'}\n` +
    `- Their pain point: ${lead.pain || 'not specified'}\n` +
    `- Lead status: ${lead.status}\n` +
    `- Last contacted: ${lastContacted}\n` +
    `- Budget: ₹${lead.budget || 'not specified'}\n` +
    'Return only the message body, no subject line, no markdown.';

  return { systemPrompt, userPrompt };
}

/**
 * Build system + user prompts for an invoice payment reminder.
 */
function buildInvoicePrompts(invoice, tone) {
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const now = new Date();
  let daysOverdue = 0;
  if (dueDate) {
    daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
    if (daysOverdue < 0) daysOverdue = 0;
  }

  const paymentLink =
    invoice.paymentLink && invoice.paymentLink.shortUrl
      ? invoice.paymentLink.shortUrl
      : 'not available';

  const systemPrompt =
    'You are a polite but effective accounts assistant. ' +
    'Write a payment reminder that feels human, not robotic. Max 100 words.';

  const userPrompt =
    `Write a ${tone} payment reminder for:\n` +
    `- Client: ${invoice.clientName}\n` +
    `- Invoice amount: ${invoice.currency || 'INR'} ${invoice.amount}\n` +
    `- Due date: ${dueDate ? dueDate.toDateString() : 'not set'}\n` +
    `- Days overdue: ${daysOverdue}\n` +
    `- Payment link: ${paymentLink}\n` +
    'Adjust firmness based on days overdue: 0-3 days = friendly, 4-14 = firm, 15+ = very urgent.\n' +
    'Return only the message body.';

  return { systemPrompt, userPrompt };
}

/**
 * Deterministic fallback message when OpenAI key is absent or call fails.
 */
function buildFallbackMessage(resourceType, resource, tone, channel) {
  if (resourceType === 'lead') {
    const name = resource.contactName || 'there';
    return `Hi ${name}, I hope you're doing well! I wanted to follow up on our recent conversation. I'd love to connect and discuss how I can help ${resource.businessName || 'your business'} move forward. Please feel free to reach out at your convenience. Looking forward to hearing from you!`;
  }
  // invoice
  const paymentLink =
    resource.paymentLink && resource.paymentLink.shortUrl
      ? ` You can pay securely here: ${resource.paymentLink.shortUrl}`
      : '';
  return `Hi ${resource.clientName || 'there'}, this is a gentle reminder that your invoice of ${resource.currency || 'INR'} ${resource.amount} is due. Kindly process the payment at your earliest convenience.${paymentLink} Thank you for your business!`;
}

/**
 * Build a nodemailer transporter if credentials are present.
 * Returns null when env vars are missing.
 */
function buildTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

// ---------------------------------------------------------------------------
// POST /api/followup/generate — Generate an AI follow-up message
// ---------------------------------------------------------------------------
router.post('/generate', protect, async (req, res) => {
  try {
    const { resourceType, resourceId, tone = 'professional', channel = 'email', scheduledAt } = req.body;

    if (!resourceType || !resourceId) {
      return res.status(400).json({ message: 'resourceType and resourceId are required' });
    }

    if (!['lead', 'invoice', 'client'].includes(resourceType)) {
      return res.status(400).json({ message: 'Invalid resourceType' });
    }

    let resource = null;
    let resourceName = '';
    let recipientEmail = '';
    let recipientName = '';

    if (resourceType === 'lead') {
      resource = await Lead.findOne({ _id: resourceId, user: req.user._id });
      if (!resource) {
        return res.status(404).json({ message: 'Lead not found' });
      }
      resourceName = resource.businessName || resource.contactName || 'Lead';
      recipientEmail = resource.email || '';
      recipientName = resource.contactName || '';
    } else if (resourceType === 'invoice') {
      resource = await Invoice.findOne({ _id: resourceId, user: req.user._id });
      if (!resource) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      resourceName = `Invoice – ${resource.clientName}`;
      recipientEmail = resource.clientEmail || '';
      recipientName = resource.clientName || '';
    } else {
      return res.status(400).json({ message: 'Follow-up generation for "client" type is not yet supported directly; use "lead" or "invoice"' });
    }

    // Build prompts
    let systemPrompt, userPrompt;
    if (resourceType === 'lead') {
      ({ systemPrompt, userPrompt } = buildLeadPrompts(resource, tone, channel));
    } else {
      ({ systemPrompt, userPrompt } = buildInvoicePrompts(resource, tone));
    }

    // Call AI — fall back gracefully when key is absent or call fails
    let aiMessage;
    let aiGenerated = true;
    try {
      aiMessage = await callOpenAI(systemPrompt, userPrompt);
    } catch (aiErr) {
      console.warn('[FollowUp] AI call failed, using fallback:', aiErr.message);
      aiMessage = buildFallbackMessage(resourceType, resource, tone, channel);
      aiGenerated = false;
    }

    // Derive a default subject
    let subject = '';
    if (channel === 'email') {
      if (resourceType === 'lead') {
        subject = `Following up – ${resourceName}`;
      } else {
        subject = `Payment Reminder – ${resourceName}`;
      }
    }

    const followUp = new FollowUp({
      user: req.user._id,
      resourceType,
      resourceId,
      resourceName,
      recipientEmail,
      recipientName,
      channel,
      scheduledAt: scheduledAt || null,
      status: 'scheduled',
      subject,
      message: aiMessage,
      tone,
      aiGenerated,
      editedByUser: false,
      context: { systemPrompt, userPrompt },
    });

    const savedDoc = await followUp.save();

    return res.status(201).json({ followUp: savedDoc, preview: aiMessage });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to generate follow-up', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/followup — List follow-ups (paginated)
// ---------------------------------------------------------------------------
router.get('/', protect, async (req, res) => {
  try {
    const { status, resourceType, page = 1, limit = 20 } = req.query;

    const filter = { user: req.user._id };
    if (status) filter.status = status;
    if (resourceType) filter.resourceType = resourceType;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [followUps, total] = await Promise.all([
      FollowUp.find(filter)
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FollowUp.countDocuments(filter),
    ]);

    return res.json({
      followUps,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch follow-ups', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/followup/:id — Get single follow-up
// ---------------------------------------------------------------------------
router.get('/:id', protect, async (req, res) => {
  try {
    const followUp = await FollowUp.findOne({ _id: req.params.id, user: req.user._id });
    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }
    return res.json({ followUp });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch follow-up', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/followup/:id — Update follow-up
// ---------------------------------------------------------------------------
router.patch('/:id', protect, async (req, res) => {
  try {
    const followUp = await FollowUp.findOne({ _id: req.params.id, user: req.user._id });
    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }

    const { message, subject, scheduledAt, status } = req.body;

    // Detect if the user is editing the AI-generated message
    if (message !== undefined && message !== followUp.message) {
      followUp.message = message;
      followUp.editedByUser = true;
    }

    if (subject !== undefined) followUp.subject = subject;
    if (scheduledAt !== undefined) followUp.scheduledAt = scheduledAt;

    // Allow limited status transitions (e.g. cancel a scheduled one)
    const allowedStatuses = ['scheduled', 'cancelled'];
    if (status !== undefined) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: `Status can only be set to: ${allowedStatuses.join(', ')}` });
      }
      followUp.status = status;
    }

    // Explicitly prevent overwriting the user field
    // (no action needed — we never read req.body.user)

    const updated = await followUp.save();
    return res.json({ followUp: updated });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update follow-up', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/followup/:id/send — Mark as sent (and optionally email)
// ---------------------------------------------------------------------------
router.post('/:id/send', protect, async (req, res) => {
  try {
    const followUp = await FollowUp.findOne({ _id: req.params.id, user: req.user._id });
    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }

    if (followUp.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot send a cancelled follow-up' });
    }

    if (followUp.status === 'sent') {
      return res.status(400).json({ message: 'Follow-up has already been sent' });
    }

    // Attempt to send via email if channel is email and credentials exist
    if (followUp.channel === 'email' && followUp.recipientEmail) {
      const transporter = buildTransporter();
      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"ClientFlow AI" <${process.env.EMAIL_USER}>`,
            to: followUp.recipientEmail,
            subject: followUp.subject || 'Following up with you',
            text: followUp.message,
          });
        } catch (mailErr) {
          console.error('[FollowUp] Email send failed:', mailErr.message);
          followUp.status = 'failed';
          await followUp.save();
          return res.status(500).json({ message: 'Failed to send email', error: mailErr.message });
        }
      }
    }

    followUp.sentAt = new Date();
    followUp.status = 'sent';
    await followUp.save();

    return res.json({ success: true, sentAt: followUp.sentAt });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to send follow-up', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/followup/:id — Soft-delete (cancel)
// ---------------------------------------------------------------------------
router.delete('/:id', protect, async (req, res) => {
  try {
    const followUp = await FollowUp.findOne({ _id: req.params.id, user: req.user._id });
    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }

    followUp.status = 'cancelled';
    await followUp.save();

    return res.json({ message: 'Follow-up cancelled successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to cancel follow-up', error: err.message });
  }
});

module.exports = router;
