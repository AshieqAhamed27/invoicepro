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

const getPromiseStatus = (invoice) => {
    const promisedDate = invoice?.paymentPromise?.promisedDate;
    if (!promisedDate || invoice.status === 'paid') return '';

    const daysUntilPromise = getDaysUntil(promisedDate);
    if (daysUntilPromise !== null && daysUntilPromise < 0) return 'missed';
    if (daysUntilPromise === 0) return 'due_today';
    return 'open';
};

const getCollectionRiskScore = (invoice) => {
    if (invoice.status === 'paid' || invoice.documentType === 'proposal') return 0;

    const amount = Number(invoice.amount || 0);
    const daysUntilDue = getDaysUntil(invoice.dueDate);
    const promiseStatus = getPromiseStatus(invoice);
    let score = Math.min(35, Math.floor(amount / 1000));

    if (daysUntilDue === null) score += 18;
    else if (daysUntilDue < 0) score += Math.min(45, Math.abs(daysUntilDue) * 5 + 18);
    else if (daysUntilDue === 0) score += 22;
    else if (daysUntilDue <= 3) score += 14;
    else if (daysUntilDue <= 7) score += 7;

    if (promiseStatus === 'missed') score += 24;
    if (promiseStatus === 'due_today') score += 12;
    if (invoice.paymentPromise?.promisedDate && promiseStatus === 'open') score -= 4;

    return Math.max(1, Math.min(100, score));
};

const getFollowUpTone = (invoice) => {
    const daysUntilDue = getDaysUntil(invoice.dueDate);
    const promiseStatus = getPromiseStatus(invoice);

    if (promiseStatus === 'missed') return 'final';
    if (daysUntilDue !== null && daysUntilDue < 0) return Math.abs(daysUntilDue) >= 7 ? 'firm' : 'polite';
    if (daysUntilDue === 0) return 'due_today';
    return 'friendly';
};

const getInvoicePaymentUrl = (invoice) => {
    if (invoice?.paymentLink?.shortUrl) return invoice.paymentLink.shortUrl;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${frontendUrl}/public/invoice/${invoice._id}`;
};

const getFollowUpMessage = (invoice, tone = getFollowUpTone(invoice)) => {
    const link = getInvoicePaymentUrl(invoice);
    const amount = formatCurrency(invoice.amount);
    const dueText = formatDate(invoice.dueDate);
    const promiseDate = invoice.paymentPromise?.promisedDate
        ? formatDate(invoice.paymentPromise.promisedDate)
        : '';

    const templates = {
        friendly: `Hi ${invoice.clientName}, hope you are doing well. Sharing invoice ${invoice.invoiceNumber} for ${amount}. You can review and pay here: ${link}. Thank you.`,
        polite: `Hi ${invoice.clientName}, gentle reminder for invoice ${invoice.invoiceNumber} of ${amount}, due on ${dueText}. Please complete it when possible: ${link}. Thank you.`,
        due_today: `Hi ${invoice.clientName}, invoice ${invoice.invoiceNumber} of ${amount} is due today. You can review and pay here: ${link}. Thank you.`,
        firm: `Hi ${invoice.clientName}, invoice ${invoice.invoiceNumber} of ${amount} is overdue since ${dueText}. Please prioritize payment here: ${link}. Thank you.`,
        final: `Hi ${invoice.clientName}, following up on invoice ${invoice.invoiceNumber} of ${amount}. Payment was promised for ${promiseDate || dueText} and is still pending. Please complete it here: ${link}.`
    };

    return templates[tone] || templates.friendly;
};

const getDateAtReminderHour = (offsetDays = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    date.setHours(10, 0, 0, 0);
    return date.toISOString();
};

const getReminderAutomationPlan = (invoice) => {
    const daysUntilDue = getDaysUntil(invoice.dueDate);
    const promiseStatus = getPromiseStatus(invoice);
    const amount = formatCurrency(invoice.amount);

    if (promiseStatus === 'missed') {
        return {
            status: 'send_now',
            shouldSendToday: true,
            label: 'Missed promise',
            cadence: 'Send now, then follow up every 2 days until paid',
            bestTime: '10:00 AM',
            nextReminderAt: getDateAtReminderHour(0),
            reason: `Client promised payment and ${amount} is still pending.`
        };
    }

    if (promiseStatus === 'due_today') {
        return {
            status: 'send_now',
            shouldSendToday: true,
            label: 'Promise due today',
            cadence: 'Send one promise follow-up today',
            bestTime: '10:00 AM',
            nextReminderAt: getDateAtReminderHour(0),
            reason: `Client promised payment today for ${amount}.`
        };
    }

    if (daysUntilDue === null) {
        return {
            status: 'needs_due_date',
            shouldSendToday: false,
            label: 'Due date missing',
            cadence: 'Add a due date to automate reminders',
            bestTime: '10:00 AM',
            nextReminderAt: null,
            reason: 'AI needs a due date to schedule reminders accurately.'
        };
    }

    if (daysUntilDue < 0) {
        const daysOverdue = Math.abs(daysUntilDue);

        return {
            status: 'send_now',
            shouldSendToday: true,
            label: `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`,
            cadence: daysOverdue >= 7 ? 'Send now, then every 2 days until paid' : 'Send now, then every 3 days until paid',
            bestTime: '10:00 AM',
            nextReminderAt: getDateAtReminderHour(0),
            reason: `Invoice is overdue and ${amount} is uncollected.`
        };
    }

    if (daysUntilDue === 0) {
        return {
            status: 'send_now',
            shouldSendToday: true,
            label: 'Due today',
            cadence: 'Send one due-date reminder today',
            bestTime: '10:00 AM',
            nextReminderAt: getDateAtReminderHour(0),
            reason: `Invoice is due today for ${amount}.`
        };
    }

    if (daysUntilDue <= 3) {
        return {
            status: 'send_now',
            shouldSendToday: true,
            label: `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`,
            cadence: 'Send one friendly reminder before the due date',
            bestTime: '10:00 AM',
            nextReminderAt: getDateAtReminderHour(0),
            reason: `Invoice is close to due date and worth ${amount}.`
        };
    }

    if (daysUntilDue <= 7) {
        return {
            status: 'scheduled',
            shouldSendToday: false,
            label: `Scheduled in ${daysUntilDue - 3} day${daysUntilDue - 3 === 1 ? '' : 's'}`,
            cadence: 'Friendly reminder 3 days before due date',
            bestTime: '10:00 AM',
            nextReminderAt: getDateAtReminderHour(Math.max(1, daysUntilDue - 3)),
            reason: `AI will remind before the invoice reaches the due date.`
        };
    }

    return {
        status: 'monitoring',
        shouldSendToday: false,
        label: 'Monitoring',
        cadence: 'Reminder starts 3 days before due date',
        bestTime: '10:00 AM',
        nextReminderAt: getDateAtReminderHour(Math.max(1, daysUntilDue - 3)),
        reason: 'No reminder is needed today.'
    };
};

const buildCollectionPlan = (invoices = []) => {
    return invoices
        .filter((invoice) => invoice.documentType !== 'proposal' && invoice.status !== 'paid')
        .map((invoice) => {
            const daysUntilDue = getDaysUntil(invoice.dueDate);
            const promiseStatus = getPromiseStatus(invoice);
            const priorityScore = getCollectionRiskScore(invoice);
            const tone = getFollowUpTone(invoice);
            const automation = getReminderAutomationPlan(invoice);

            return {
                id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientName,
                clientEmail: invoice.clientEmail,
                amount: invoice.amount,
                dueDate: invoice.dueDate,
                daysUntilDue,
                priorityScore,
                tone,
                promiseStatus,
                automationStatus: automation.status,
                automationLabel: automation.label,
                automationCadence: automation.cadence,
                automationReason: automation.reason,
                automationBestTime: automation.bestTime,
                nextReminderAt: automation.nextReminderAt,
                shouldSendToday: automation.shouldSendToday,
                paymentPromise: invoice.paymentPromise || null,
                reason: promiseStatus === 'missed'
                    ? 'Promise-to-pay date was missed'
                    : daysUntilDue === null
                        ? 'No due date set'
                        : daysUntilDue < 0
                            ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} overdue`
                            : daysUntilDue === 0
                                ? 'Due today'
                                : `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`,
                suggestedAction: tone === 'final'
                    ? 'Send final reminder'
                    : tone === 'firm'
                        ? 'Send firm reminder'
                        : 'Send friendly reminder',
                followUpMessage: getFollowUpMessage(invoice, tone),
                messageVariants: {
                    friendly: getFollowUpMessage(invoice, 'friendly'),
                    polite: getFollowUpMessage(invoice, 'polite'),
                    firm: getFollowUpMessage(invoice, 'firm'),
                    final: getFollowUpMessage(invoice, 'final')
                }
            };
        })
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 6);
};

const buildClientPaymentScores = (invoices = []) => {
    const groups = new Map();

    invoices
        .filter((invoice) => invoice.documentType !== 'proposal')
        .forEach((invoice) => {
            const key = invoice.clientEmail || invoice.clientName || String(invoice._id);
            const existing = groups.get(key) || {
                clientName: invoice.clientName,
                clientEmail: invoice.clientEmail,
                totalInvoices: 0,
                paidInvoices: 0,
                pendingInvoices: 0,
                overdueInvoices: 0,
                paidAmount: 0,
                pendingAmount: 0
            };

            const status = getInvoiceOperationalStatus(invoice);
            existing.totalInvoices += 1;

            if (invoice.status === 'paid') {
                existing.paidInvoices += 1;
                existing.paidAmount += Number(invoice.amount || 0);
            } else {
                existing.pendingInvoices += 1;
                existing.pendingAmount += Number(invoice.amount || 0);
            }

            if (status === 'overdue') {
                existing.overdueInvoices += 1;
            }

            groups.set(key, existing);
        });

    return Array.from(groups.values())
        .map((client) => {
            const paidRate = client.totalInvoices
                ? Math.round((client.paidInvoices / client.totalInvoices) * 100)
                : 0;
            const overduePenalty = Math.min(45, client.overdueInvoices * 18);
            const pendingPenalty = Math.min(25, client.pendingInvoices * 7);
            const score = Math.max(10, Math.min(100, 35 + paidRate - overduePenalty - pendingPenalty));
            const label = score >= 78
                ? 'Fast payer'
                : score >= 55
                    ? 'Normal payer'
                    : score >= 35
                        ? 'Slow payer'
                        : 'High risk';

            return {
                ...client,
                score,
                label
            };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 5);
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
    const link = getInvoicePaymentUrl(invoice);

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

const roundPrice = (value) => {
    const amount = Number(value || 0);
    const step = amount < 10000 ? 500 : amount < 100000 ? 1000 : 5000;
    return Math.max(step, Math.round(amount / step) * step);
};

const getPriceCategory = (text) => {
    const value = String(text || '').toLowerCase();

    if (/\b(ecommerce|e-commerce|shopify|woocommerce|online store|payment gateway)\b/.test(value)) {
        return { label: 'E-commerce website', low: 25000, recommended: 55000, high: 120000 };
    }

    if (/\b(web app|saas|dashboard|crm|portal|admin panel|mern|full stack|full-stack)\b/.test(value)) {
        return { label: 'Web application / SaaS work', low: 40000, recommended: 90000, high: 220000 };
    }

    if (/\b(website|wordpress|business site|portfolio site|company site)\b/.test(value)) {
        return { label: 'Business website', low: 12000, recommended: 28000, high: 65000 };
    }

    if (/\b(landing page|sales page|lead page)\b/.test(value)) {
        return { label: 'Landing page', low: 7000, recommended: 16000, high: 35000 };
    }

    if (/\b(logo|brand identity|branding|brand kit)\b/.test(value)) {
        return { label: 'Branding / logo design', low: 3000, recommended: 10000, high: 30000 };
    }

    if (/\b(social media|instagram|facebook|content calendar|posts|reels)\b/.test(value)) {
        return { label: 'Social media package', low: 6000, recommended: 18000, high: 45000 };
    }

    if (/\b(seo|search engine|google ranking|technical seo)\b/.test(value)) {
        return { label: 'SEO service', low: 8000, recommended: 22000, high: 60000 };
    }

    if (/\b(video|editing|reel|youtube|motion graphics)\b/.test(value)) {
        return { label: 'Video editing / motion work', low: 2500, recommended: 10000, high: 35000 };
    }

    if (/\b(copywriting|content writing|blog|article|script)\b/.test(value)) {
        return { label: 'Writing / content service', low: 1500, recommended: 6000, high: 20000 };
    }

    if (/\b(consulting|consultation|strategy|audit|training)\b/.test(value)) {
        return { label: 'Consulting / strategy service', low: 5000, recommended: 18000, high: 75000 };
    }

    return { label: 'Professional service project', low: 5000, recommended: 18000, high: 50000 };
};

const getComplexityMultiplier = (complexity) => ({
    simple: 0.78,
    standard: 1,
    advanced: 1.45,
    premium: 1.9
}[String(complexity || 'standard').toLowerCase()] || 1);

const getExperienceMultiplier = (experienceLevel) => ({
    beginner: 0.78,
    intermediate: 1,
    senior: 1.35,
    expert: 1.7
}[String(experienceLevel || 'intermediate').toLowerCase()] || 1);

const getClientMultiplier = (clientType) => ({
    individual: 0.85,
    small_business: 1,
    startup: 1.18,
    agency: 1.28,
    enterprise: 1.65
}[String(clientType || 'small_business').toLowerCase()] || 1);

const getTimelineMultiplier = (timeline) => {
    const value = String(timeline || '').toLowerCase();
    if (/\b(today|tomorrow|urgent|rush|24|48)\b/.test(value)) return 1.35;
    if (/\b(week|7 days|fast)\b/.test(value)) return 1.15;
    return 1;
};

const buildPriceSuggestionFallback = (context = {}) => {
    const items = getContextItems(context);
    const serviceText = compactText(
        [
            context.serviceName,
            context.serviceDescription,
            context.scope,
            items.map((item) => item.name).join(', ')
        ].filter(Boolean).join(' '),
        'professional service project'
    );
    const category = getPriceCategory(serviceText);
    const multiplier =
        getComplexityMultiplier(context.complexity) *
        getExperienceMultiplier(context.experienceLevel) *
        getClientMultiplier(context.clientType) *
        getTimelineMultiplier(context.timeline);
    const low = roundPrice(category.low * multiplier);
    const recommended = roundPrice(category.recommended * multiplier);
    const high = Math.max(recommended + 1000, roundPrice(category.high * multiplier));
    const currentTotal = toMoneyNumber(context.currentTotal || context.amount);
    const currentTotalSignal = currentTotal
        ? currentTotal < low
            ? 'below_range'
            : currentTotal > high
                ? 'above_range'
                : 'inside_range'
        : 'not_set';

    return {
        serviceLabel: category.label,
        currency: 'INR',
        pricingModel: 'Fixed project',
        range: { low, recommended, high },
        confidence: serviceText.length > 20 ? 'Medium' : 'Low',
        currentTotal,
        currentTotalSignal,
        strategyTips: [
            currentTotalSignal === 'below_range'
                ? 'Your current invoice total looks below the suggested range. Increase scope clarity or quote closer to the recommended number.'
                : currentTotalSignal === 'above_range'
                    ? 'Your current total is above the suggested range. Justify it with stronger deliverables, timeline, support, or measurable outcomes.'
                    : 'Keep the recommended price as the main quote, then show a smaller starter option and a higher premium option.',
            'Avoid quoting only one number. Offer three packages so the client can choose based on value, not only cost.',
            'Mention revision limits, delivery timeline, and what is excluded. Clear boundaries protect your margin.',
            'For urgent delivery, add a rush fee instead of silently absorbing extra pressure.'
        ],
        packageIdeas: [
            {
                name: 'Starter',
                price: low,
                positioning: 'Lean version with essential deliverables and limited revisions.'
            },
            {
                name: 'Recommended',
                price: recommended,
                positioning: 'Best balance of scope, quality, review, and delivery support.'
            },
            {
                name: 'Premium',
                price: high,
                positioning: 'Full-scope delivery with priority turnaround, extra revisions, and handover support.'
            }
        ],
        assumptions: [
            'Estimate is based on Indian freelancer and small-business project pricing patterns.',
            'Final price should change based on exact scope, deadlines, revisions, assets, and client expectations.'
        ],
        disclaimer: 'This is a pricing estimate, not a guaranteed market rate.'
    };
};

const normalizePriceSuggestion = (value, fallback) => {
    const raw = value && typeof value === 'object' ? value : {};
    const fallbackRange = fallback.range;
    const low = roundPrice(raw?.range?.low || raw.low || fallbackRange.low);
    const recommended = roundPrice(raw?.range?.recommended || raw.recommended || fallbackRange.recommended);
    const high = Math.max(recommended, roundPrice(raw?.range?.high || raw.high || fallbackRange.high));

    return {
        serviceLabel: compactText(raw.serviceLabel, fallback.serviceLabel),
        currency: 'INR',
        pricingModel: compactText(raw.pricingModel, fallback.pricingModel),
        range: { low, recommended, high },
        confidence: compactText(raw.confidence, fallback.confidence),
        currentTotal: toMoneyNumber(raw.currentTotal || fallback.currentTotal),
        currentTotalSignal: compactText(raw.currentTotalSignal, fallback.currentTotalSignal),
        strategyTips: (Array.isArray(raw.strategyTips) && raw.strategyTips.length ? raw.strategyTips : fallback.strategyTips)
            .map((tip) => compactText(tip))
            .filter(Boolean)
            .slice(0, 5),
        packageIdeas: (Array.isArray(raw.packageIdeas) && raw.packageIdeas.length ? raw.packageIdeas : fallback.packageIdeas)
            .map((item) => ({
                name: compactText(item?.name, 'Package'),
                price: roundPrice(item?.price || recommended),
                positioning: compactText(item?.positioning, 'Clear scope and delivery expectations.')
            }))
            .slice(0, 3),
        assumptions: (Array.isArray(raw.assumptions) && raw.assumptions.length ? raw.assumptions : fallback.assumptions)
            .map((assumption) => compactText(assumption))
            .filter(Boolean)
            .slice(0, 4),
        disclaimer: compactText(raw.disclaimer, fallback.disclaimer)
    };
};

const toTitleCase = (value = '') =>
    String(value || '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());

const compactArray = (value, fallback = []) => {
    const source = Array.isArray(value) && value.length ? value : fallback;
    return source
        .map((item) => {
            if (typeof item === 'string') return compactText(item);
            if (item && typeof item === 'object') return item;
            return '';
        })
        .filter((item) => {
            if (typeof item === 'string') return Boolean(item);
            return item && Object.keys(item).length > 0;
        });
};

const getClientFinderCategory = (serviceText) => {
    const value = String(serviceText || '').toLowerCase();

    if (/\b(website|web app|saas|mern|react|wordpress|shopify|software)\b/.test(value)) {
        return {
            label: 'Website and software services',
            niches: ['local clinics', 'coaching centres', 'real estate agents', 'boutiques', 'small manufacturers'],
            pain: 'They need a better online presence, enquiry flow, or payment-ready website.',
            offer: 'Website audit plus a conversion-focused landing page or business website.',
            price: 18000
        };
    }

    if (/\b(social media|instagram|facebook|content|seo|marketing|ads)\b/.test(value)) {
        return {
            label: 'Digital marketing services',
            niches: ['restaurants', 'salons', 'gyms', 'coaches', 'local stores'],
            pain: 'They need more leads and consistent content without hiring a full team.',
            offer: '30-day content and lead campaign with weekly reporting.',
            price: 12000
        };
    }

    if (/\b(video|editing|reel|youtube|motion)\b/.test(value)) {
        return {
            label: 'Video and content production',
            niches: ['coaches', 'educators', 'real estate agents', 'fitness trainers', 'D2C brands'],
            pain: 'They need short-form content that looks professional and posts consistently.',
            offer: 'Monthly short-video editing package with hooks, captions, and thumbnails.',
            price: 10000
        };
    }

    if (/\b(design|logo|brand|ui|ux|figma)\b/.test(value)) {
        return {
            label: 'Design and branding services',
            niches: ['new businesses', 'D2C sellers', 'cafes', 'consultants', 'app founders'],
            pain: 'They need trust-building visuals before launching or selling.',
            offer: 'Starter brand kit with logo, colors, social templates, and landing page direction.',
            price: 15000
        };
    }

    return {
        label: 'Freelance professional service',
        niches: ['local service businesses', 'consultants', 'small agencies', 'coaches', 'online sellers'],
        pain: 'They need a specialist who can solve one business problem without a full-time hire.',
        offer: 'Focused project package with clear deliverables, timeline, and payment milestones.',
        price: 15000
    };
};

const buildClientFinderFallback = (context = {}) => {
    const service = compactText(context.service, 'freelance service');
    const skills = compactText(context.skills, service);
    const targetMarket = compactText(context.targetMarket, 'small businesses');
    const location = compactText(context.location, 'India');
    const goal = compactText(context.goal, 'get 3 paying clients this month');
    const category = getClientFinderCategory(`${service} ${skills}`);
    const price = roundPrice(toMoneyNumber(context.projectPrice) || category.price);
    const starterPrice = roundPrice(price * 0.65);
    const premiumPrice = roundPrice(price * 1.6);
    const targetSegments = Array.from(new Set([
            targetMarket,
            ...category.niches
        ]
        .map((item) => compactText(item))
        .filter(Boolean)))
        .slice(0, 5);
    const firstNiche = targetSegments[0] || targetMarket || category.niches[0];

    return {
        positioning: `${service} for ${targetMarket} who want ${category.pain.toLowerCase()}`,
        bestNiche: firstNiche,
        starterOffer: {
            title: category.offer,
            price,
            promise: `Help ${firstNiche} improve enquiries, trust, or sales with a clear ${service} package.`,
            deliverables: [
                'Discovery call and problem audit',
                'Clear scope with milestones',
                'Delivery package with one review cycle',
                'ClientFlow AI proposal and payment link'
            ]
        },
        targetClients: targetSegments.map((niche, index) => ({
            segment: `${toTitleCase(niche)} in ${location}`,
            problem: category.pain,
            offerAngle: index % 2 === 0 ?
                'Offer a quick audit and show one improvement they can make this week.' :
                'Offer a fixed-price starter package so the client can decide quickly.',
            whereToFind: ['Google Maps', 'LinkedIn', 'Instagram', 'local business directories'][index % 4]
        })),
        leadSearches: [{
                platform: 'Google',
                query: `${firstNiche} ${location} contact email`
            },
            {
                platform: 'LinkedIn',
                query: `${firstNiche} ${location}`
            },
            {
                platform: 'Instagram',
                query: `${firstNiche} ${location} business`
            },
            {
                platform: 'Google Maps',
                query: `${firstNiche} near ${location}`
            }
        ],
        outreachMessages: [{
                channel: 'LinkedIn',
                text: `Hi, I help ${firstNiche} improve enquiries with ${service}. I noticed many businesses lose leads because their online flow is unclear. Would you like me to share 2 quick improvement ideas for your business?`
            },
            {
                channel: 'WhatsApp',
                text: `Hi, I am a freelancer helping ${firstNiche} with ${service}. I can do a quick audit and suggest how to improve enquiries or trust. Would you like me to share a simple idea?`
            },
            {
                channel: 'Email',
                text: `Subject: Quick idea for your business\n\nHi,\n\nI help ${firstNiche} with ${service}. I found a few simple improvements that could make your business look more trustworthy and get more enquiries.\n\nIf useful, I can share a short audit and a fixed-price package.\n\nRegards`
            }
        ],
        packages: [{
                name: 'Starter',
                price: starterPrice,
                scope: 'Small audit plus one focused improvement.'
            },
            {
                name: 'Growth',
                price,
                scope: 'Recommended package with complete delivery and one review cycle.'
            },
            {
                name: 'Premium',
                price: premiumPrice,
                scope: 'Higher-touch package with strategy, delivery, revisions, and handover.'
            }
        ],
        weeklyPlan: [
            'Day 1: Pick one niche and collect 20 possible leads from Google Maps, LinkedIn, or Instagram.',
            'Day 2: Send 10 personalized messages with one useful observation for each client.',
            'Day 3: Follow up with a short audit or sample idea for interested leads.',
            'Day 4: Send a ClientFlow AI proposal with clear scope, timeline, and price.',
            'Day 5: Follow up on proposals and offer a starter package for fast decision.',
            'Day 6: Convert accepted proposal into invoice and collect advance payment.',
            'Day 7: Review replies, update your best message, and repeat the strongest niche.'
        ],
        growthSystem: {
            headline: `Turn ${service} into a repeatable client pipeline`,
            pipeline: [{
                    stage: 'Find',
                    goal: `Collect 20 ${firstNiche} leads from ${location}`,
                    action: 'Use the lead searches and save promising businesses before messaging.'
                },
                {
                    stage: 'Qualify',
                    goal: 'Score each lead before outreach',
                    action: 'Prioritize leads with visible pain, active business activity, and a clear revenue reason.'
                },
                {
                    stage: 'Pitch',
                    goal: 'Start a useful conversation',
                    action: 'Send one personalized observation and ask permission to share ideas.'
                },
                {
                    stage: 'Propose',
                    goal: 'Turn interested leads into a clear project',
                    action: 'Send a ClientFlow AI proposal with scope, price, validity, and payment milestone.'
                },
                {
                    stage: 'Invoice',
                    goal: 'Collect advance or final payment',
                    action: 'Convert accepted proposals into invoices and collect through Razorpay, UPI, or public link.'
                }
            ]
        },
        idealClientSignals: [
            'Business is active online but the enquiry or booking flow is weak.',
            'Owner is reachable and already spending effort on sales, content, or local visibility.',
            'The problem connects to revenue, trust, time saved, or faster customer response.',
            `They can afford a ${formatCurrency(price)} project without needing many approvals.`
        ],
        redFlags: [
            'They ask for free complete work before a proposal.',
            'They have no clear owner, decision maker, or response path.',
            'They only compare the lowest price and ignore business outcome.',
            'They avoid advance payment, written scope, or invoice terms.'
        ],
        discoveryQuestions: [
            'What result would make this project worth paying for?',
            'Where are you currently losing enquiries, trust, or sales?',
            'Who will approve the work and payment?',
            'What deadline or business event is making this important now?',
            'Would you prefer a starter package or a complete growth package?'
        ],
        qualificationScorecard: [{
                criterion: 'Pain is visible',
                strongSignal: 'Their current online flow has obvious gaps.',
                weakSignal: 'They only say they are browsing ideas.'
            },
            {
                criterion: 'Can pay',
                strongSignal: `Budget can support around ${formatCurrency(price)}.`,
                weakSignal: 'They ask for heavy discount before seeing scope.'
            },
            {
                criterion: 'Fast decision',
                strongSignal: 'Owner or decision maker is directly involved.',
                weakSignal: 'Many unclear approvals are needed.'
            },
            {
                criterion: 'Repeat potential',
                strongSignal: 'They may need monthly support after the first project.',
                weakSignal: 'One tiny task with no follow-up value.'
            }
        ],
        objectionHandlers: [{
                objection: 'Your price is high.',
                response: `I understand. The ${formatCurrency(price)} package is priced around the outcome and the full delivery scope. We can also start with the starter package if you want a smaller first step.`
            },
            {
                objection: 'We will think and tell you later.',
                response: 'Sure. To make the decision easier, I can send a short proposal with scope, timeline, and price valid for 7 days.'
            },
            {
                objection: 'Can you show proof?',
                response: 'I can share a small audit of your current flow and explain what I would improve first before you decide.'
            }
        ],
        proposalToInvoicePath: [
            'Save the interested lead as a client.',
            'Generate a proposal from the client finder plan.',
            'Send the public proposal link and collect approval.',
            'Convert accepted proposal into an invoice.',
            'Collect advance or final payment through the invoice payment link.'
        ],
        proposalDraft: {
            documentType: 'proposal',
            clientName: '',
            clientEmail: '',
            serviceDescription: `${category.offer} for ${toTitleCase(firstNiche)}. Includes discovery, delivery, review, and payment milestone through ClientFlow AI.`,
            items: [{
                name: category.offer,
                price
            }],
            cgst: 0,
            sgst: 0,
            validUntil: getDateAfterDays(7),
            notes: `Goal: ${goal}. Scope can be adjusted after the discovery call.`
        },
        guardrails: [
            'Do not spam bulk messages. Personalize each outreach with one real observation.',
            'Ask permission before sending repeated WhatsApp follow-ups.',
            'Use ClientFlow AI proposal links only after the client shows interest.'
        ]
    };
};

const normalizeClientFinderPlan = (value, fallback) => {
    const raw = value && typeof value === 'object' ? value : {};
    const starterOffer = raw.starterOffer && typeof raw.starterOffer === 'object' ? raw.starterOffer : fallback.starterOffer;
    const proposalDraft = raw.proposalDraft && typeof raw.proposalDraft === 'object' ? raw.proposalDraft : fallback.proposalDraft;
    const growthSystem = raw.growthSystem && typeof raw.growthSystem === 'object' ? raw.growthSystem : fallback.growthSystem;

    return {
        positioning: compactText(raw.positioning, fallback.positioning),
        bestNiche: compactText(raw.bestNiche, fallback.bestNiche),
        starterOffer: {
            title: compactText(starterOffer.title, fallback.starterOffer.title),
            price: toMoneyNumber(starterOffer.price) || fallback.starterOffer.price,
            promise: compactText(starterOffer.promise, fallback.starterOffer.promise),
            deliverables: compactArray(starterOffer.deliverables, fallback.starterOffer.deliverables).slice(0, 6)
        },
        targetClients: compactArray(raw.targetClients, fallback.targetClients).slice(0, 6),
        leadSearches: compactArray(raw.leadSearches, fallback.leadSearches).slice(0, 6),
        outreachMessages: compactArray(raw.outreachMessages, fallback.outreachMessages).slice(0, 5),
        packages: compactArray(raw.packages, fallback.packages).slice(0, 4),
        weeklyPlan: compactArray(raw.weeklyPlan, fallback.weeklyPlan).slice(0, 8),
        growthSystem: {
            headline: compactText(growthSystem.headline, fallback.growthSystem.headline),
            pipeline: compactArray(growthSystem.pipeline, fallback.growthSystem.pipeline).slice(0, 6)
        },
        idealClientSignals: compactArray(raw.idealClientSignals, fallback.idealClientSignals).slice(0, 6),
        redFlags: compactArray(raw.redFlags, fallback.redFlags).slice(0, 6),
        discoveryQuestions: compactArray(raw.discoveryQuestions, fallback.discoveryQuestions).slice(0, 7),
        qualificationScorecard: compactArray(raw.qualificationScorecard, fallback.qualificationScorecard).slice(0, 6),
        objectionHandlers: compactArray(raw.objectionHandlers, fallback.objectionHandlers).slice(0, 5),
        proposalToInvoicePath: compactArray(raw.proposalToInvoicePath, fallback.proposalToInvoicePath).slice(0, 6),
        proposalDraft: {
            documentType: 'proposal',
            clientName: compactText(proposalDraft.clientName, ''),
            clientEmail: compactText(proposalDraft.clientEmail, '').toLowerCase(),
            serviceDescription: compactText(proposalDraft.serviceDescription, fallback.proposalDraft.serviceDescription),
            items: calculateTotals(Array.isArray(proposalDraft.items) ? proposalDraft.items : fallback.proposalDraft.items, 0, 0).items,
            cgst: 0,
            sgst: 0,
            validUntil: toDateInput(proposalDraft.validUntil) || fallback.proposalDraft.validUntil,
            notes: compactText(proposalDraft.notes, fallback.proposalDraft.notes)
        },
        guardrails: compactArray(raw.guardrails, fallback.guardrails).slice(0, 4)
    };
};

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
        'You are ClientFlow AI, a concise billing assistant for Indian freelancers, agencies, and consultants.',
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
        'You are ClientFlow AI, a billing agent for Indian freelancers, agencies, and consultants.',
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

const callOpenAiPriceSuggestion = ({ context, fallback }) => new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return resolve(null);

    const prompt = [
        'You are ClientFlow AI, a pricing strategy assistant for Indian freelancers, consultants, agencies, and service businesses.',
        'Return only valid JSON. No markdown, no explanation.',
        'Give a realistic INR project price range and strategy tips. Do not guarantee exact market rates.',
        'JSON shape: serviceLabel, pricingModel, range{low,recommended,high}, confidence, currentTotalSignal, strategyTips[], packageIdeas[{name,price,positioning}], assumptions[], disclaimer.',
        'Keep prices as numbers in INR. Use practical Indian small-business context.',
        `Service context: ${JSON.stringify(context)}`,
        `Rule baseline: ${JSON.stringify(fallback)}`
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

const callOpenAiClientFinder = ({ context, fallback }) => new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return resolve(null);

    const prompt = [
        'You are ClientFlow AI, an ethical client acquisition coach for freelancers and small agencies.',
        'Return only valid JSON. No markdown, no explanation.',
        'Do not invent real private contact details. Do not recommend spam. Suggest niches, search queries, outreach copy, offers, and a proposal draft.',
        'Prioritize the user supplied targetMarket and location exactly. Do not replace them with unrelated client categories.',
        'JSON shape: positioning, bestNiche, starterOffer{title,price,promise,deliverables[]}, targetClients[{segment,problem,offerAngle,whereToFind}], leadSearches[{platform,query}], outreachMessages[{channel,text}], packages[{name,price,scope}], weeklyPlan[], growthSystem{headline,pipeline[{stage,goal,action}]}, idealClientSignals[], redFlags[], discoveryQuestions[], qualificationScorecard[{criterion,strongSignal,weakSignal}], objectionHandlers[{objection,response}], proposalToInvoicePath[], proposalDraft{documentType,clientName,clientEmail,serviceDescription,items,cgst,sgst,validUntil,notes}, guardrails[].',
        'Use practical Indian freelancer context. Keep prices as INR numbers. The proposalDraft must be ready for ClientFlow AI.',
        `User context: ${JSON.stringify(context)}`,
        `Rule fallback: ${JSON.stringify(fallback)}`
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
        timeout: 14000
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

router.post('/client-finder', protect, async(req, res) => {
    const context = req.body?.context || {};
    const fallback = buildClientFinderFallback(context);

    try {
        const openAiPlan = await callOpenAiClientFinder({ context, fallback });
        res.json({
            source: openAiPlan ? 'openai' : 'rules',
            plan: normalizeClientFinderPlan(openAiPlan, fallback)
        });
    } catch (err) {
        console.error('AI CLIENT FINDER FALLBACK:', err.message);
        res.json({
            source: 'rules',
            plan: fallback
        });
    }
});

router.post('/price-suggestion', protect, async(req, res) => {
    const context = req.body?.context || {};
    const fallback = buildPriceSuggestionFallback(context);

    try {
        const openAiSuggestion = await callOpenAiPriceSuggestion({ context, fallback });
        res.json({
            source: openAiSuggestion ? 'openai' : 'rules',
            suggestion: normalizePriceSuggestion(openAiSuggestion, fallback)
        });
    } catch (err) {
        console.error('AI PRICE SUGGESTION FALLBACK:', err.message);
        res.json({
            source: 'rules',
            suggestion: fallback
        });
    }
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
            .select('clientName clientEmail amount status invoiceNumber dueDate documentType createdAt paidAt paymentPromise paymentLink')
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
            .select('clientName clientEmail amount status invoiceNumber dueDate documentType createdAt paidAt paymentPromise paymentLink')
            .lean();

        const billableInvoices = invoices.filter((invoice) => invoice.documentType !== 'proposal');
        const total = billableInvoices.length;
        const pendingInvoices = billableInvoices.filter((invoice) => invoice.status === 'pending');
        const paidInvoices = billableInvoices.filter((invoice) => invoice.status === 'paid');
        const pendingAmount = pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
        const paidAmount = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
        const collectionPlan = buildCollectionPlan(billableInvoices);
        const reminderSendNowQueue = collectionPlan.filter((item) => item.shouldSendToday);
        const reminderScheduledQueue = collectionPlan.filter((item) => item.automationStatus === 'scheduled' || item.automationStatus === 'monitoring');
        const clientPaymentScores = buildClientPaymentScores(billableInvoices);
        const promisesDue = pendingInvoices.filter((invoice) => {
            const promiseStatus = getPromiseStatus(invoice);
            return promiseStatus === 'missed' || promiseStatus === 'due_today';
        });

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

        const topRisk = collectionPlan[0] || overdueInvoices[0] || dueSoonInvoices[0] || pendingInvoices[0] || null;
        const recommendations = [];
        const moneyActions = [];

        if (!total) {
            recommendations.push('Create your first invoice with a due date and UPI ID so ClientFlow AI can start predicting payment risk.');
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

        if (promisesDue.length) {
            recommendations.push(`${promisesDue.length} promise-to-pay follow-up${promisesDue.length > 1 ? 's are' : ' is'} due now. Check those before sending new invoices.`);
            moneyActions.push({
                title: 'Follow promised payments',
                description: 'A client promised to pay, so this should be your highest-priority follow-up.',
                value: String(promisesDue.length),
                cta: 'Open collection agent'
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

        if (collectionPlan[0]) {
            moneyActions.unshift({
                title: 'AI top collection target',
                description: `${collectionPlan[0].clientName} has the highest follow-up priority: ${collectionPlan[0].reason}.`,
                value: formatCurrency(collectionPlan[0].amount),
                cta: collectionPlan[0].suggestedAction
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
                largestPendingAmount: Number(largestPending?.amount || 0),
                promisesDueAmount: promisesDue.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
                recoverableThisWeek: collectionPlan
                    .filter((item) => item.daysUntilDue === null || item.daysUntilDue <= 7 || item.promiseStatus === 'missed' || item.promiseStatus === 'due_today')
                    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
            },
            moneyActions: moneyActions.slice(0, 4),
            collectionPlan,
            reminderAutomation: {
                mode: 'whatsapp_assisted',
                note: 'AI prepares and prioritizes reminders automatically. WhatsApp still requires a user click unless WhatsApp Business API is connected.',
                sendNowCount: reminderSendNowQueue.length,
                scheduledCount: reminderScheduledQueue.length,
                queuedAmount: reminderSendNowQueue.reduce((sum, item) => sum + Number(item.amount || 0), 0),
                nextTarget: reminderSendNowQueue[0] || collectionPlan[0] || null,
                queue: reminderSendNowQueue.slice(0, 5).map((item) => ({
                    id: item.id,
                    invoiceNumber: item.invoiceNumber,
                    clientName: item.clientName,
                    amount: item.amount,
                    tone: item.tone,
                    label: item.automationLabel,
                    bestTime: item.automationBestTime,
                    message: item.followUpMessage
                }))
            },
            clientPaymentScores,
            promiseStats: {
                dueNow: promisesDue.length,
                dueNowAmount: promisesDue.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
                active: pendingInvoices.filter((invoice) => invoice.paymentPromise?.promisedDate).length
            },
            proUpsell: req.user?.plan === 'free' ? {
                title: 'Unlock ClientFlow AI Revenue Coach',
                description: 'Use Pro to pair payment links, recurring billing, and collection prompts with unlimited invoices.',
                path: '/payment'
            } : null,
            recommendations: recommendations.slice(0, 4),
            topRisk: topRisk ? {
                id: topRisk.id || topRisk._id,
                clientName: topRisk.clientName,
                invoiceNumber: topRisk.invoiceNumber,
                amount: topRisk.amount,
                dueDate: topRisk.dueDate,
                daysUntilDue: topRisk.daysUntilDue ?? getDaysUntil(topRisk.dueDate),
                priorityScore: topRisk.priorityScore || getCollectionRiskScore(topRisk),
                reminder: topRisk.followUpMessage || buildReminder(topRisk)
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
