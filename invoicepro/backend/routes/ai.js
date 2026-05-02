const express = require('express');
const https = require('https');
const Invoice = require('../models/Invoice');
const { protect } = require('../middleware/auth');

const router = express.Router();

const formatCurrency = (amount) =>
    `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;

const formatDate = (date) => {
    if (!date) return 'not set';

    return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

const getDaysUntil = (date) => {
    if (!date) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(date);
    due.setHours(0, 0, 0, 0);

    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

const toMoneyNumber = (value) => {
    const cleaned = String(value ?? '').replace(/,/g, '').replace(/[^\d.-]/g, '');
    const number = Number(cleaned);
    return Number.isFinite(number) && number > 0 ? number : 0;
};

const toPercentNumber = (value) => {
    const number = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(number) && number > 0 ? Math.min(number, 100) : 0;
};

const toDateInput = (value) => {
    if (!value) return '';

    if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) {
        return String(value).slice(0, 10);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toISOString().slice(0, 10);
};

const getDateAfterDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return toDateInput(date);
};

const getRelativeDueDate = (message) => {
    const lower = String(message || '').toLowerCase();
    if (lower.includes('tomorrow')) return getDateAfterDays(1);
    if (lower.includes('today')) return getDateAfterDays(0);

    const daysMatch = lower.match(/\b(?:due|valid|validity)\s+(?:in\s+)?(\d{1,3})\s+days?\b/);
    if (daysMatch) return getDateAfterDays(Number(daysMatch[1]));

    const dateMatch = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (dateMatch) return dateMatch[1];

    return '';
};

const extractTaxRates = (message) => {
    const text = String(message || '').toLowerCase();
    const cgst = toPercentNumber(text.match(/\bcgst\s*(?:is|at)?\s*(\d+(?:\.\d+)?)\s*%?/)?.[1]);
    const sgst = toPercentNumber(text.match(/\bsgst\s*(?:is|at)?\s*(\d+(?:\.\d+)?)\s*%?/)?.[1]);

    if (cgst || sgst) return { cgst, sgst };

    const gst = toPercentNumber(text.match(/\b(?:gst|tax)\s*(?:is|at|of)?\s*(\d+(?:\.\d+)?)\s*%?/)?.[1]);
    if (gst) return { cgst: gst / 2, sgst: gst / 2 };

    return { cgst: 0, sgst: 0 };
};

const calculateTotals = (items = [], cgst = 0, sgst = 0) => {
    const normalizedItems = (Array.isArray(items) ? items : [])
        .map((item) => ({
            name: String(item?.name || 'Professional services').trim() || 'Professional services',
            price: toMoneyNumber(item?.price)
        }))
        .filter((item) => item.name || item.price > 0);

    const subtotal = normalizedItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const cgstRate = toPercentNumber(cgst);
    const sgstRate = toPercentNumber(sgst);
    const taxRate = cgstRate + sgstRate;
    const tax = Number(((subtotal * taxRate) / 100).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    return {
        items: normalizedItems.length ? normalizedItems : [{ name: 'Professional services', price: subtotal }],
        subtotal,
        cgst: cgstRate,
        sgst: sgstRate,
        taxRate,
        tax,
        total
    };
};

const getInvoiceOperationalStatus = (invoice) => {
    if (invoice.status === 'paid') return 'paid';
    const daysUntilDue = getDaysUntil(invoice.dueDate);
    if (daysUntilDue !== null && daysUntilDue < 0) return 'overdue';
    return 'pending';
};

const buildStatusSummary = (invoices = []) => {
    const billableInvoices = invoices.filter((invoice) => invoice.documentType !== 'proposal');
    const paid = billableInvoices.filter((invoice) => invoice.status === 'paid');
    const pending = billableInvoices.filter((invoice) => invoice.status !== 'paid');
    const overdue = pending.filter((invoice) => getInvoiceOperationalStatus(invoice) === 'overdue');

    const paidAmount = paid.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const pendingAmount = pending.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const overdueAmount = overdue.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

    return {
        total: billableInvoices.length,
        paid: paid.length,
        pending: pending.length,
        overdue: overdue.length,
        paidAmount,
        pendingAmount,
        overdueAmount,
        topOverdue: overdue
            .slice()
            .sort((a, b) => getDaysUntil(a.dueDate) - getDaysUntil(b.dueDate))
            .slice(0, 3)
            .map((invoice) => ({
                id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientName,
                amount: invoice.amount,
                dueDate: invoice.dueDate,
                daysOverdue: Math.abs(getDaysUntil(invoice.dueDate) || 0)
            }))
    };
};

const detectAgentIntent = (message) => {
    const text = String(message || '').toLowerCase();

    if (/\b(create|generate|make|draft|prepare|new)\b/.test(text) && /\b(invoice|proposal|bill)\b/.test(text)) {
        return 'create_invoice';
    }

    if (/\b(total|calculate|calc|gst|tax|amount|subtotal)\b/.test(text)) {
        return 'calculate_total';
    }

    if (/\b(pending|paid|overdue|due|status|cash|collection|collect|unpaid)\b/.test(text)) {
        return 'status_summary';
    }

    return 'assistant';
};

const extractJsonObject = (text) => {
    const raw = String(text || '').trim();
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {}

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
};

const buildRuleInvoiceDraft = (message, user = {}) => {
    const text = String(message || '');
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
    const taxRates = extractTaxRates(text);
    const amountMatch = text.match(/(?:rs\.?|inr|₹)\s*([0-9][\d,]*(?:\.\d+)?)|([0-9][\d,]*(?:\.\d+)?)\s*(?:rs\.?|inr|₹)/i);
    const price = toMoneyNumber(amountMatch?.[1] || amountMatch?.[2]);
    const documentType = /\bproposal\b/i.test(text) ? 'proposal' : 'invoice';
    const nameMatch = text.match(/\bfor\s+([a-zA-Z][a-zA-Z0-9 .&'-]{1,60})/);
    const roughName = nameMatch?.[1]
        ?.replace(email, '')
        ?.replace(/\b(?:invoice|proposal|bill|website|design|development|service|services|for|with|due|rs|inr|gst|tax).*/i, '')
        ?.trim();
    const itemText = text
        .replace(email, '')
        .replace(amountMatch?.[0] || '', '')
        .replace(/\b(create|generate|make|draft|prepare|new|invoice|proposal|bill|for|with|gst|tax|due|in|days?|today|tomorrow)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const totals = calculateTotals([
        {
            name: itemText || 'Professional services',
            price
        }
    ], taxRates.cgst, taxRates.sgst);

    return {
        documentType,
        clientName: roughName || '',
        clientEmail: email,
        serviceDescription: `${documentType === 'proposal' ? 'Proposed' : 'Professional'} services: ${totals.items.map((item) => item.name).join(', ')}.`,
        items: totals.items,
        cgst: totals.cgst,
        sgst: totals.sgst,
        dueDate: documentType === 'invoice' ? (getRelativeDueDate(text) || getDateAfterDays(7)) : '',
        validUntil: documentType === 'proposal' ? (getRelativeDueDate(text) || getDateAfterDays(7)) : '',
        upiId: documentType === 'invoice' ? (user.upiId || '') : '',
        notes: '',
        amount: totals.total,
        totals
    };
};

const normalizeInvoiceDraft = (draft, message, user) => {
    const fallback = buildRuleInvoiceDraft(message, user);
    const raw = draft && typeof draft === 'object' ? draft : {};
    const rawGstRate = toPercentNumber(raw.gstRate || raw.gst || raw.taxRate);
    const cgst = toPercentNumber(raw.cgst) || (rawGstRate ? rawGstRate / 2 : fallback.cgst);
    const sgst = toPercentNumber(raw.sgst) || (rawGstRate ? rawGstRate / 2 : fallback.sgst);
    const rawItems = Array.isArray(raw.items) ? raw.items : fallback.items;
    const totals = calculateTotals(rawItems, cgst, sgst);
    const documentType = String(raw.documentType || fallback.documentType).toLowerCase() === 'proposal' ? 'proposal' : 'invoice';

    return {
        documentType,
        clientName: String(raw.clientName || fallback.clientName || '').trim(),
        clientEmail: String(raw.clientEmail || fallback.clientEmail || '').trim().toLowerCase(),
        serviceDescription: String(raw.serviceDescription || fallback.serviceDescription || '').trim(),
        items: totals.items,
        cgst: totals.cgst,
        sgst: totals.sgst,
        dueDate: documentType === 'invoice' ? (toDateInput(raw.dueDate) || fallback.dueDate || getDateAfterDays(7)) : '',
        validUntil: documentType === 'proposal' ? (toDateInput(raw.validUntil) || fallback.validUntil || getDateAfterDays(7)) : '',
        upiId: documentType === 'invoice' ? String(raw.upiId || user.upiId || fallback.upiId || '').trim() : '',
        notes: String(raw.notes || fallback.notes || '').trim(),
        amount: totals.total,
        totals
    };
};

const buildReminder = (invoice) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontendUrl}/public/invoice/${invoice._id}`;

    return `Hi ${invoice.clientName}, quick reminder for invoice ${invoice.invoiceNumber} of ${formatCurrency(invoice.amount)} due on ${formatDate(invoice.dueDate)}. You can review and pay here: ${link}. Thank you.`;
};

const getContextItems = (context = {}) => {
    const sourceItems = Array.isArray(context.items) ? context.items : [];
    return sourceItems
        .map((item) => ({
            name: String(item?.name || '').trim(),
            price: toMoneyNumber(item?.price)
        }))
        .filter((item) => item.name || item.price > 0);
};

const compactText = (value, fallback = '') =>
    String(value || fallback)
        .replace(/\s+/g, ' ')
        .trim();

const pickVariant = (seed, count) => {
    const text = String(seed || Date.now());
    let hash = 0;

    for (let index = 0; index < text.length; index += 1) {
        hash = (hash * 31 + text.charCodeAt(index)) % 9973;
    }

    return Math.abs(hash) % count;
};

const buildDraftFallback = (type, context = {}) => {
    const items = getContextItems(context);
    const itemNames = compactText(
        items.map((item) => item.name).filter(Boolean).join(', '),
        compactText(context.serviceDescription, 'professional services')
    );
    const primaryItem = items.find((item) => item.name)?.name || itemNames;
    const clientName = compactText(context.clientName, 'the client');
    const amount = context.amount ? formatCurrency(context.amount) : 'the agreed total';
    const taxRate = toPercentNumber(context.taxRate) || toPercentNumber(context.cgst) + toPercentNumber(context.sgst);
    const dueDate = context.dueDate || context.validUntil;
    const dateText = dueDate ? ` Target date: ${formatDate(dueDate)}.` : '';
    const taxText = taxRate ? ` Tax applied at ${taxRate}%.` : '';
    const seed = `${type}|${context.variantSeed || ''}|${clientName}|${itemNames}|${amount}|${taxRate}|${dueDate}`;

    if (type === 'payment-reminder') {
        const reminders = [
            `Hi ${clientName}, this is a quick reminder that ${amount} is pending for ${primaryItem}. Please review the payment link when convenient. Thank you.`,
            `Hi ${clientName}, sharing a friendly follow-up for the pending invoice of ${amount}. The invoice covers ${itemNames}. Please complete payment when possible.`,
            `Hi ${clientName}, your invoice for ${itemNames} is still awaiting payment. Amount due: ${amount}.${dateText} Thank you.`
        ];
        return reminders[pickVariant(seed, reminders.length)];
    }

    if (type === 'proposal-summary') {
        const proposals = [
            `Proposal for ${clientName}: ${itemNames}. Scope includes execution, review, and approval support with a total value of ${amount}.${dateText}`,
            `Prepared proposal covering ${itemNames} for ${clientName}. The engagement includes planned delivery, feedback rounds, and final handover. Total: ${amount}.${dateText}`,
            `${clientName} proposal summary: deliver ${itemNames} with clear milestones, review checkpoints, and completion support. Estimated value: ${amount}.${dateText}`
        ];
        return proposals[pickVariant(seed, proposals.length)];
    }

    const invoices = [
        `Invoice summary for ${clientName}: ${itemNames}. Work includes service delivery, review, and final handover. Total payable: ${amount}.${taxText}${dateText}`,
        `Billing note for ${clientName}: ${primaryItem} and related professional work completed as agreed. Invoice total is ${amount}.${taxText}${dateText}`,
        `${clientName} is being billed for ${itemNames}. This invoice covers the completed scope, coordination, and final delivery. Amount due: ${amount}.${taxText}${dateText}`,
        `Professional services delivered for ${clientName}: ${itemNames}. The invoice includes completed work, quality review, and handover support. Total: ${amount}.${taxText}${dateText}`
    ];

    return invoices[pickVariant(seed, invoices.length)];
};

const extractOpenAiText = (body) => {
    if (body?.output_text) return body.output_text;

    const output = Array.isArray(body?.output) ? body.output : [];
    for (const item of output) {
        const content = Array.isArray(item?.content) ? item.content : [];
        for (const part of content) {
            if (part?.text) return part.text;
        }
    }

    return '';
};

const callOpenAiDraft = ({ type, context }) => new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return resolve('');

    const prompt = [
        'You are InvoicePro AI, a concise billing assistant for Indian freelancers, agencies, and consultants.',
        'Write one polished client-facing billing text. No markdown. No emojis. Keep it under 55 words.',
        'Use the actual client, item names, total, tax, and date. Avoid generic wording and do not repeat the same sentence structure.',
        `Task: ${type}.`,
        `Client: ${context.clientName || 'Client'}.`,
        `Items: ${Array.isArray(context.items) ? context.items.map((item) => item?.name).filter(Boolean).join(', ') : 'Professional services'}.`,
        `Amount: ${context.amount ? formatCurrency(context.amount) : 'Not specified'}.`,
        `Existing draft: ${context.serviceDescription || 'None'}.`,
        `Tax rate: ${context.taxRate || Number(context.cgst || 0) + Number(context.sgst || 0) || 0}%.`,
        `Date: ${context.dueDate || context.validUntil || 'Not set'}.`,
        `Variation seed: ${context.variantSeed || Date.now()}.`
    ].join('\n');

    const payload = JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        input: prompt
    });

    const request = https.request({
        hostname: 'api.openai.com',
        path: '/v1/responses',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 12000
    }, (response) => {
        let raw = '';
        response.on('data', (chunk) => { raw += chunk; });
        response.on('end', () => {
            try {
                const body = raw ? JSON.parse(raw) : {};
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    return reject(new Error(body?.error?.message || 'OpenAI request failed'));
                }
                resolve(extractOpenAiText(body));
            } catch (err) {
                reject(err);
            }
        });
    });

    request.on('error', reject);
    request.on('timeout', () => request.destroy(new Error('OpenAI request timed out')));
    request.write(payload);
    request.end();
});

const callOpenAiInvoiceDraft = ({ message, user }) => new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return resolve(null);

    const today = toDateInput(new Date());
    const prompt = [
        'You are InvoicePro AI, a billing agent for Indian freelancers, agencies, and consultants.',
        'Extract an invoice or proposal draft from the user message.',
        'Return only valid JSON. No markdown, no explanation.',
        'JSON fields: documentType, clientName, clientEmail, serviceDescription, items, cgst, sgst, gstRate, dueDate, validUntil, upiId, notes.',
        'items must be an array of objects with name and price. Use INR numbers only. If one GST rate is mentioned, set gstRate.',
        'Use YYYY-MM-DD for dates. For invoices, set dueDate. For proposals, set validUntil.',
        `Today: ${today}.`,
        `Default UPI ID: ${user?.upiId || 'not set'}.`,
        `User message: ${message}`
    ].join('\n');

    const payload = JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        input: prompt
    });

    const request = https.request({
        hostname: 'api.openai.com',
        path: '/v1/responses',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 12000
    }, (response) => {
        let raw = '';
        response.on('data', (chunk) => { raw += chunk; });
        response.on('end', () => {
            try {
                const body = raw ? JSON.parse(raw) : {};
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    return reject(new Error(body?.error?.message || 'OpenAI request failed'));
                }

                resolve(extractJsonObject(extractOpenAiText(body)));
            } catch (err) {
                reject(err);
            }
        });
    });

    request.on('error', reject);
    request.on('timeout', () => request.destroy(new Error('OpenAI request timed out')));
    request.write(payload);
    request.end();
});

router.post('/agent', protect, async(req, res) => {
    const message = String(req.body?.message || '').trim();
    const context = req.body?.context || {};

    if (!message) {
        return res.status(400).json({
            message: 'Ask the AI agent what you want to create, calculate, or check.'
        });
    }

    try {
        const intent = detectAgentIntent(message);
        const invoices = await Invoice.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .select('clientName clientEmail amount status invoiceNumber dueDate documentType createdAt paidAt')
            .limit(100)
            .lean();
        const statusSummary = buildStatusSummary(invoices);
        const hasContextItems = Array.isArray(context.items)
            && context.items.some((item) => String(item?.name || '').trim() || toMoneyNumber(item?.price) > 0);
        const contextTotals = calculateTotals(
            context.items || context.form?.items || [],
            context.cgst ?? context.form?.cgst,
            context.sgst ?? context.form?.sgst
        );

        let draft = null;
        let source = 'rules';

        if (intent === 'create_invoice' || intent === 'calculate_total') {
            try {
                const openAiDraft = await callOpenAiInvoiceDraft({ message, user: req.user });
                draft = normalizeInvoiceDraft(openAiDraft, message, req.user);
                source = openAiDraft ? 'openai' : 'rules';
            } catch (err) {
                console.error('AI AGENT DRAFT FALLBACK:', err.message);
                draft = normalizeInvoiceDraft(null, message, req.user);
            }
        }

        const activeTotals = draft?.totals || contextTotals;
        const suggestions = [];

        if (draft && !draft.clientEmail) suggestions.push('Add the client email before creating the invoice.');
        if (draft && !draft.clientName) suggestions.push('Confirm the client name before sending.');
        if (draft && draft.documentType === 'invoice' && !draft.upiId) suggestions.push('Add a UPI ID in Settings or on this invoice before collecting payment.');
        if (statusSummary.overdue > 0) suggestions.push(`Follow up on ${statusSummary.overdue} overdue invoice${statusSummary.overdue > 1 ? 's' : ''} worth ${formatCurrency(statusSummary.overdueAmount)}.`);
        if (!suggestions.length) suggestions.push('Keep due dates and payment links on every invoice so the agent can track cashflow clearly.');

        const reply = draft
            ? `I prepared a ${draft.documentType} draft for ${draft.clientName || 'your client'} with total ${formatCurrency(draft.amount)}. Review it before sending.`
            : `You have ${statusSummary.pending} pending invoice${statusSummary.pending === 1 ? '' : 's'}, ${statusSummary.paid} paid, and ${statusSummary.overdue} overdue. Pending value is ${formatCurrency(statusSummary.pendingAmount)}.`;

        res.json({
            source,
            intent,
            reply,
            draft,
            totals: draft || intent === 'calculate_total' || hasContextItems
                ? {
                    subtotal: activeTotals.subtotal,
                    tax: activeTotals.tax,
                    taxRate: activeTotals.taxRate,
                    total: activeTotals.total,
                    cgst: activeTotals.cgst,
                    sgst: activeTotals.sgst
                }
                : null,
            statusSummary,
            suggestions: suggestions.slice(0, 4)
        });
    } catch (err) {
        console.error('AI AGENT ERROR:', err);
        res.status(500).json({ message: 'AI agent failed. Please try again.' });
    }
});

router.post('/draft', protect, async(req, res) => {
    const type = String(req.body?.type || 'invoice-summary');
    const context = req.body?.context || {};
    const fallback = buildDraftFallback(type, context);

    try {
        const generated = await callOpenAiDraft({ type, context });
        res.json({
            source: generated ? 'openai' : 'rules',
            text: generated || fallback
        });
    } catch (err) {
        console.error('AI DRAFT FALLBACK:', err.message);
        res.json({
            source: 'rules',
            text: fallback
        });
    }
});

router.get('/insights', protect, async(req, res) => {
    try {
        const invoices = await Invoice.find({
                user: req.user._id
            })
            .sort({
                createdAt: -1
            })
            .select('clientName clientEmail amount status invoiceNumber dueDate createdAt paidAt')
            .lean();

        const total = invoices.length;
        const pendingInvoices = invoices.filter((invoice) => invoice.status === 'pending');
        const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid');
        const pendingAmount = pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
        const paidAmount = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

        const overdueInvoices = pendingInvoices
            .map((invoice) => ({
                ...invoice,
                daysUntilDue: getDaysUntil(invoice.dueDate)
            }))
            .filter((invoice) => invoice.daysUntilDue !== null && invoice.daysUntilDue < 0)
            .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

        const dueSoonInvoices = pendingInvoices
            .map((invoice) => ({
                ...invoice,
                daysUntilDue: getDaysUntil(invoice.dueDate)
            }))
            .filter((invoice) => invoice.daysUntilDue !== null && invoice.daysUntilDue >= 0 && invoice.daysUntilDue <= 3)
            .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

        const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
        const dueSoonAmount = dueSoonInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
        const largestPending = pendingInvoices
            .slice()
            .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0] || null;
        const missingDueDates = pendingInvoices.filter((invoice) => !invoice.dueDate).length;
        const paidRatio = total ? Math.round((paidInvoices.length / total) * 100) : 0;
        const overduePenalty = Math.min(overdueInvoices.length * 12, 36);
        const pendingPenalty = Math.min(pendingInvoices.length * 5, 25);
        const missingDuePenalty = Math.min(missingDueDates * 4, 16);
        const cashFlowScore = Math.max(28, Math.min(98, 92 - overduePenalty - pendingPenalty - missingDuePenalty + Math.round(paidRatio / 8)));

        const topRisk = overdueInvoices[0] || dueSoonInvoices[0] || pendingInvoices[0] || null;
        const recommendations = [];
        const moneyActions = [];

        if (!total) {
            recommendations.push('Create your first invoice with a due date and UPI ID so InvoicePro can start predicting payment risk.');
        }

        if (overdueInvoices.length) {
            recommendations.push(`Follow up on ${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''} worth ${formatCurrency(overdueAmount)}.`);
            moneyActions.push({
                title: 'Recover overdue revenue',
                description: `Send reminders for ${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''}.`,
                value: formatCurrency(overdueAmount),
                cta: 'Send reminders'
            });
        }

        if (dueSoonInvoices.length) {
            recommendations.push(`${dueSoonInvoices.length} invoice${dueSoonInvoices.length > 1 ? 's are' : ' is'} due within 3 days. Send a friendly reminder today.`);
            moneyActions.push({
                title: 'Protect upcoming cash',
                description: `Nudge ${dueSoonInvoices.length} client${dueSoonInvoices.length > 1 ? 's' : ''} before the due date passes.`,
                value: formatCurrency(dueSoonAmount),
                cta: 'Copy reminder'
            });
        }

        if (missingDueDates) {
            recommendations.push(`Add due dates to ${missingDueDates} pending invoice${missingDueDates > 1 ? 's' : ''} to improve follow-up accuracy.`);
        }

        if (pendingAmount > paidAmount && pendingInvoices.length) {
            recommendations.push('Pending revenue is higher than collected revenue. Prioritize the largest pending invoice first.');
        }

        if (largestPending) {
            moneyActions.push({
                title: 'Prioritize largest invoice',
                description: `${largestPending.clientName || 'A client'} has the biggest pending amount right now.`,
                value: formatCurrency(largestPending.amount),
                cta: 'Open dashboard'
            });
        }

        if (req.user?.plan === 'free') {
            moneyActions.push({
                title: 'Turn billing into a paid workflow',
                description: 'Upgrade Pro for unlimited invoices, recurring billing, Razorpay checkout, and AI collection prompts.',
                value: 'Pro',
                cta: 'Upgrade'
            });
        }

        if (!moneyActions.length) {
            moneyActions.push({
                title: 'Keep the payment loop moving',
                description: 'Create the next invoice with a due date and payment link while cashflow is healthy.',
                value: 'Ready',
                cta: 'Create invoice'
            });
        }

        if (!recommendations.length) {
            recommendations.push('Cashflow looks healthy. Keep sending invoices with clear due dates and payment links.');
        }

        res.json({
            summary: total ?
                `AI reviewed ${total} invoice${total > 1 ? 's' : ''}, ${formatCurrency(pendingAmount)} pending, and ${formatCurrency(paidAmount)} collected.` :
                'AI is ready to learn from your first invoice.',
            cashFlowScore,
            cards: [{
                    title: 'Payment risk',
                    value: overdueInvoices.length ? `${overdueInvoices.length} overdue` : dueSoonInvoices.length ? `${dueSoonInvoices.length} due soon` : 'Low',
                    tone: overdueInvoices.length ? 'red' : dueSoonInvoices.length ? 'yellow' : 'green'
                },
                {
                    title: 'Pending amount',
                    value: formatCurrency(pendingAmount),
                    tone: pendingAmount ? 'yellow' : 'green'
                },
                {
                    title: 'Paid rate',
                    value: `${paidRatio}%`,
                    tone: paidRatio >= 70 ? 'green' : paidRatio >= 40 ? 'yellow' : 'red'
                }
            ],
            revenueOpportunity: {
                pendingAmount,
                overdueAmount,
                dueSoonAmount,
                largestPendingAmount: Number(largestPending?.amount || 0)
            },
            moneyActions: moneyActions.slice(0, 4),
            proUpsell: req.user?.plan === 'free' ? {
                title: 'Unlock InvoicePro AI Revenue Coach',
                description: 'Use Pro to pair payment links, recurring billing, and collection prompts with unlimited invoices.',
                path: '/payment'
            } : null,
            recommendations: recommendations.slice(0, 4),
            topRisk: topRisk ? {
                id: topRisk._id,
                clientName: topRisk.clientName,
                invoiceNumber: topRisk.invoiceNumber,
                amount: topRisk.amount,
                dueDate: topRisk.dueDate,
                daysUntilDue: getDaysUntil(topRisk.dueDate),
                reminder: buildReminder(topRisk)
            } : null
        });

    } catch (err) {
        console.error('AI INSIGHTS ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

module.exports = router;
