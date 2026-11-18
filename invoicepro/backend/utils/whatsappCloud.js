/**
 * ClientFlow AI - Meta WhatsApp Cloud API Service
 * Official integration for automated client billing notifications, invoice dispatch,
 * due date alerts, and payment receipts.
 */

const normalizeWhatsAppPhone = (phone) => {
    if (!phone) return '';
    // Strip all non-digit characters
    let cleaned = String(phone).replace(/\D/g, '');
    // If it's a 10-digit Indian mobile number, prefix country code 91
    if (cleaned.length === 10) {
        cleaned = `91${cleaned}`;
    }
    // Remove leading zero if present before country code
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.replace(/^0+/, '');
    }
    return cleaned;
};

/**
 * Send a WhatsApp template message or freeform text via Meta Cloud API
 */
const sendWhatsAppMessage = async ({ to, templateName, languageCode = 'en_US', components = [], textBody = null }) => {
    // Only dispatch automated bot messages when explicitly enabled via WHATSAPP_BOT_ENABLED=true
    if (process.env.WHATSAPP_BOT_ENABLED !== 'true') {
        return { success: false, reason: 'WHATSAPP_BOT_PAUSED' };
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
        console.warn('[WhatsApp Cloud] Credentials not configured. Skipping WhatsApp dispatch.');
        return { success: false, reason: 'WHATSAPP_NOT_CONFIGURED' };
    }

    const formattedRecipient = normalizeWhatsAppPhone(to);
    if (!formattedRecipient) {
        console.warn('[WhatsApp Cloud] Invalid or empty recipient phone number.');
        return { success: false, reason: 'INVALID_PHONE_NUMBER' };
    }

    const endpoint = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    let payload;
    if (templateName) {
        payload = {
            messaging_product: 'whatsapp',
            to: formattedRecipient,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                ...(components && components.length > 0 ? { components } : {})
            }
        };
    } else if (textBody) {
        payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedRecipient,
            type: 'text',
            text: {
                preview_url: true,
                body: textBody
            }
        };
    } else {
        return { success: false, reason: 'NO_CONTENT_SPECIFIED' };
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[WhatsApp Cloud API Error]:', JSON.stringify(data, null, 2));
            return {
                success: false,
                status: response.status,
                error: data.error || data
            };
        }

        console.log(`[WhatsApp Cloud] Successfully delivered to +${formattedRecipient}. Message ID:`, data.messages?.[0]?.id);
        return {
            success: true,
            messageId: data.messages?.[0]?.id,
            data
        };
    } catch (err) {
        console.error('[WhatsApp Cloud Network Error]:', err.message);
        return { success: false, error: err.message };
    }
};

/**
 * Dispatch automated invoice alert when a new invoice is generated
 */
const sendInvoiceWhatsAppAlert = async ({ to, invoice, freelancerName, publicUrl }) => {
    if (!to) return null;

    const formattedTo = normalizeWhatsAppPhone(to);
    const invoiceNumber = invoice.invoiceNumber || `INV-${invoice._id?.toString().slice(-6)}`;
    const totalAmount = `${invoice.currency || 'INR'} ${(invoice.total || invoice.amount || 0).toLocaleString('en-IN')}`;
    const sender = freelancerName || 'Your Freelancer';

    // In Meta Cloud API test sandbox, only pre-approved templates or recipients that opted in receive messages.
    // We attempt text message first (if 24hr customer window open) or fallback to approved template.
    const textBody = `📄 *New Invoice from ${sender}*\n\n` +
        `• *Invoice #*: ${invoiceNumber}\n` +
        `• *Amount Due*: ${totalAmount}\n` +
        `• *Due Date*: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'Upon receipt'}\n\n` +
        `👉 View & Pay Securely via UPI / Bank:\n${publicUrl}\n\n` +
        `_Powered by ClientFlow AI_`;

    console.log(`[WhatsApp Cloud] Dispatching invoice alert for ${invoiceNumber} to +${formattedTo}...`);

    // In Meta WhatsApp Cloud API, business-initiated messages MUST be sent via an approved Template.
    // Plain text messages outside the 24-hour customer care window are silently dropped by Meta.
    // We send the approved template first to guarantee delivery!
    let result = await sendWhatsAppMessage({
        to: formattedTo,
        templateName: 'hello_world',
        languageCode: 'en_US'
    });

    // Also attempt freeform text message with full invoice details & pay link (delivered if 24hr window is active)
    await sendWhatsAppMessage({ to: formattedTo, textBody });

    return result;
};

/**
 * Dispatch payment confirmation receipt via WhatsApp
 */
const sendPaymentReceiptWhatsApp = async ({ to, invoice, amountPaid, paymentMethod = 'UPI' }) => {
    if (!to) return null;
    const formattedTo = normalizeWhatsAppPhone(to);
    const invoiceNumber = invoice.invoiceNumber || `INV-${invoice._id?.toString().slice(-6)}`;

    const textBody = `✅ *Payment Received - Thank You!*\n\n` +
        `• *Invoice #*: ${invoiceNumber}\n` +
        `• *Amount Received*: INR ${Number(amountPaid).toLocaleString('en-IN')}\n` +
        `• *Method*: ${paymentMethod}\n` +
        `• *Status*: PAID\n\n` +
        `Your receipt has been recorded. Have a great day!\n\n` +
        `_ClientFlow AI Billing_`;

    return sendWhatsAppMessage({ to: formattedTo, textBody });
};

module.exports = {
    normalizeWhatsAppPhone,
    sendWhatsAppMessage,
    sendInvoiceWhatsAppAlert,
    sendPaymentReceiptWhatsApp
};
