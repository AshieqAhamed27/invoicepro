const crypto = require('crypto');

const GRAPH_BASE_URL = 'https://graph.facebook.com';

const getEnv = (name, fallback = '') => String(process.env[name] || fallback).trim();

const isTruthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());

const getWhatsAppConfig = () => {
    const accessToken = getEnv('WHATSAPP_CLOUD_API_TOKEN') || getEnv('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = getEnv('WHATSAPP_PHONE_NUMBER_ID');
    const businessAccountId = getEnv('WHATSAPP_BUSINESS_ACCOUNT_ID');
    const apiVersion = getEnv('WHATSAPP_API_VERSION', 'v23.0');
    const verifyToken = getEnv('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
    const appSecret = getEnv('WHATSAPP_APP_SECRET');
    const reminderTemplateName = getEnv('WHATSAPP_REMINDER_TEMPLATE_NAME');
    const templateLanguage = getEnv('WHATSAPP_TEMPLATE_LANGUAGE', 'en_US');
    const allowFreeform = isTruthy(getEnv('WHATSAPP_ALLOW_FREEFORM', 'false'));
    const defaultCountryCode = getEnv('WHATSAPP_DEFAULT_COUNTRY_CODE', '91');

    return {
        accessToken,
        phoneNumberId,
        businessAccountId,
        apiVersion,
        verifyToken,
        appSecret,
        reminderTemplateName,
        templateLanguage,
        allowFreeform,
        defaultCountryCode,
        enabled: Boolean(accessToken && phoneNumberId)
    };
};

const getWhatsAppStatus = () => {
    const config = getWhatsAppConfig();

    return {
        enabled: config.enabled,
        phoneNumberIdConfigured: Boolean(config.phoneNumberId),
        accessTokenConfigured: Boolean(config.accessToken),
        businessAccountIdConfigured: Boolean(config.businessAccountId),
        webhookVerifyTokenConfigured: Boolean(config.verifyToken),
        appSecretConfigured: Boolean(config.appSecret),
        reminderTemplateConfigured: Boolean(config.reminderTemplateName),
        templateLanguage: config.templateLanguage,
        freeformAllowed: config.allowFreeform,
        webhookPath: '/api/whatsapp/webhook'
    };
};

const normalizePhoneNumber = (phone, defaultCountryCode = '91') => {
    const digits = String(phone || '').replace(/\D/g, '');

    if (!digits) return '';
    if (digits.length === 10 && defaultCountryCode) return `${defaultCountryCode}${digits}`;
    return digits;
};

const formatAmount = (invoice) => {
    const currency = invoice.currency === 'USD' ? 'USD' : 'Rs';
    return `${currency} ${Number(invoice.amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
};

const formatDate = (value) => {
    if (!value) return 'not specified';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'not specified';

    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

const buildInvoiceReminderMessage = ({ invoice, publicUrl, senderName }) => [
    `Hi ${invoice.clientName},`,
    `This is a payment reminder for invoice ${invoice.invoiceNumber} of ${formatAmount(invoice)}.`,
    `Due date: ${formatDate(invoice.dueDate)}.`,
    `You can review and pay here: ${publicUrl}`,
    `Thank you, ${senderName}.`
].join('\n\n');

const assertConfigured = (config = getWhatsAppConfig()) => {
    if (!config.accessToken || !config.phoneNumberId) {
        const error = new Error('WhatsApp Cloud API is not configured. Add WHATSAPP_CLOUD_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID.');
        error.status = 400;
        throw error;
    }
};

const postToWhatsApp = async(body, config = getWhatsAppConfig()) => {
    assertConfigured(config);

    if (typeof fetch !== 'function') {
        const error = new Error('WhatsApp Cloud API requires Node.js 18+ fetch support.');
        error.status = 500;
        throw error;
    }

    const response = await fetch(`${GRAPH_BASE_URL}/${config.apiVersion}/${config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = data?.error?.message || 'WhatsApp Cloud API request failed';
        const error = new Error(message);
        error.status = response.status;
        error.meta = data;
        throw error;
    }

    return data;
};

const sendTextMessage = async({ to, text }) => {
    const config = getWhatsAppConfig();
    const phone = normalizePhoneNumber(to, config.defaultCountryCode);

    if (!phone) {
        const error = new Error('Client WhatsApp phone number is required.');
        error.status = 400;
        throw error;
    }

    if (!config.allowFreeform) {
        const error = new Error('Free-form WhatsApp messages are disabled. Add an approved template or set WHATSAPP_ALLOW_FREEFORM=true for testing inside the 24-hour customer window.');
        error.status = 400;
        throw error;
    }

    return postToWhatsApp({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: {
            preview_url: true,
            body: text
        }
    }, config);
};

const sendInvoiceReminderTemplate = async({ to, invoice, publicUrl, senderName }) => {
    const config = getWhatsAppConfig();
    const phone = normalizePhoneNumber(to, config.defaultCountryCode);

    if (!phone) {
        const error = new Error('Client WhatsApp phone number is required.');
        error.status = 400;
        throw error;
    }

    if (!config.reminderTemplateName) {
        const message = buildInvoiceReminderMessage({ invoice, publicUrl, senderName });
        return sendTextMessage({ to: phone, text: message });
    }

    return postToWhatsApp({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
            name: config.reminderTemplateName,
            language: {
                code: config.templateLanguage
            },
            components: [{
                type: 'body',
                parameters: [
                    { type: 'text', text: invoice.clientName || 'Client' },
                    { type: 'text', text: invoice.invoiceNumber || 'Invoice' },
                    { type: 'text', text: formatAmount(invoice) },
                    { type: 'text', text: formatDate(invoice.dueDate) },
                    { type: 'text', text: publicUrl },
                    { type: 'text', text: senderName || 'InvoicePro' }
                ]
            }]
        }
    }, config);
};

const verifyWebhookSignature = (req, config = getWhatsAppConfig()) => {
    if (!config.appSecret) return true;

    const signature = String(req.headers['x-hub-signature-256'] || '');
    const rawBody = req.rawBody || '';

    if (!signature.startsWith('sha256=')) return false;

    const expected = `sha256=${crypto
        .createHmac('sha256', config.appSecret)
        .update(rawBody)
        .digest('hex')}`;

    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
};

module.exports = {
    buildInvoiceReminderMessage,
    getWhatsAppConfig,
    getWhatsAppStatus,
    normalizePhoneNumber,
    sendInvoiceReminderTemplate,
    verifyWebhookSignature
};
