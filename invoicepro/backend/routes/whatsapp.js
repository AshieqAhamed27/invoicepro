const express = require('express');
const Invoice = require('../models/Invoice');
const { protect } = require('../middleware/auth');
const { isValidObjectId, rejectInvalidObjectId } = require('../utils/objectId');
const { getPublicInvoiceUrl } = require('../utils/recurrence');
const {
    getWhatsAppConfig,
    getWhatsAppStatus,
    normalizePhoneNumber,
    sendInvoiceReminderTemplate,
    verifyWebhookSignature
} = require('../utils/whatsappCloud');

const router = express.Router();

const DEFAULT_COMPANY_NAME = 'InvoicePro Billing Technologies';

router.get('/status', protect, (req, res) => {
    res.json({
        status: getWhatsAppStatus()
    });
});

router.post('/invoices/:id/reminder', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'invoice');
        }

        const invoice = await Invoice.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        if (invoice.documentType === 'proposal') {
            return res.status(400).json({ message: 'WhatsApp payment reminders are only available for invoices.' });
        }
        if (invoice.status === 'paid') {
            return res.status(400).json({ message: 'This invoice is already paid.' });
        }

        const config = getWhatsAppConfig();
        const to = normalizePhoneNumber(req.body?.phone || invoice.clientPhone, config.defaultCountryCode);

        if (!to) {
            return res.status(400).json({
                message: 'Client WhatsApp phone number is required. Add the client phone number with country code, for example 919080963704.'
            });
        }

        const publicUrl = invoice.paymentLink?.shortUrl || getPublicInvoiceUrl(process.env.FRONTEND_URL, invoice._id);
        const senderName = req.user.companyName || DEFAULT_COMPANY_NAME;
        const result = await sendInvoiceReminderTemplate({
            to,
            invoice,
            publicUrl,
            senderName
        });

        const providerMessageId = result?.messages?.[0]?.id || '';
        invoice.clientPhone = invoice.clientPhone || to;
        invoice.reminderEvents = [
            ...(invoice.reminderEvents || []),
            {
                channel: 'whatsapp_cloud',
                provider: 'meta',
                providerMessageId,
                to,
                status: 'sent',
                message: config.reminderTemplateName || 'freeform_text',
                sentAt: new Date(),
                raw: result
            }
        ];
        await invoice.save();

        res.json({
            message: 'WhatsApp reminder sent successfully.',
            providerMessageId,
            invoice
        });
    } catch (err) {
        console.error('WHATSAPP REMINDER ERROR:', err.message);
        res.status(err.status || 500).json({
            message: err.message || 'WhatsApp reminder failed',
            details: err.meta || null
        });
    }
});

router.get('/webhook', (req, res) => {
    const config = getWhatsAppConfig();
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token && token === config.verifyToken) {
        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
});

router.post('/webhook', async(req, res) => {
    try {
        if (!verifyWebhookSignature(req)) {
            return res.sendStatus(403);
        }

        const changes = req.body?.entry?.flatMap((entry) => entry.changes || []) || [];
        const statuses = changes.flatMap((change) => change.value?.statuses || []);

        if (statuses.length) {
            await Promise.all(statuses.map(async(status) => {
                const messageId = status.id;
                if (!messageId) return null;

                return Invoice.findOneAndUpdate(
                    { 'reminderEvents.providerMessageId': messageId },
                    {
                        $set: {
                            'reminderEvents.$.status': status.status || 'updated',
                            'reminderEvents.$.updatedAt': new Date(),
                            'reminderEvents.$.raw': status
                        }
                    },
                    { new: true }
                ).catch(() => null);
            }));
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('WHATSAPP WEBHOOK ERROR:', err.message);
        res.sendStatus(200);
    }
});

module.exports = router;
