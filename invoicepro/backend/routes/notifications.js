const express = require('express');
const Invoice = require('../models/Invoice');
const Lead = require('../models/Lead');
const TeamProject = require('../models/TeamProject');
const User = require('../models/User');
const NotificationLog = require('../models/NotificationLog');
const sendEmail = require('../utils/sendEmail');
const { invoiceReminder, proposalReminder, userDailyDigest } = require('../utils/emailTemplates');

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_COMPANY_NAME = 'ClientFlow AI';
const INVOICE_REMINDER_DAYS = [-7, -3, -1, 0, 2];
const PROPOSAL_REMINDER_DAYS = [-1, 0, 2];

const boolEnv = (name, fallback = true) => {
    const value = String(process.env[name] || '').trim().toLowerCase();
    if (!value) return fallback;
    return !['0', 'false', 'no', 'off'].includes(value);
};

const startOfDayUTC = (date) => new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
));

const dayKey = (date = new Date()) => startOfDayUTC(date).toISOString().slice(0, 10);

const daysUntil = (dateValue) => {
    if (!dateValue) return null;
    const target = startOfDayUTC(new Date(dateValue));
    if (Number.isNaN(target.getTime())) return null;
    return Math.round((target - startOfDayUTC(new Date())) / DAY_MS);
};

const getPublicInvoiceUrl = (frontendUrl, invoiceId) => {
    const base = String(frontendUrl || '').replace(/\/+$/, '') || 'https://www.clientflowai.in';
    return `${base}/public/invoice/${invoiceId}`;
};

const isInvoiceReminderDay = (invoice) => {
    const delta = daysUntil(invoice.dueDate);
    if (delta === null) return false;
    return INVOICE_REMINDER_DAYS.includes(delta);
};

const isProposalReminderDay = (proposal) => {
    const delta = daysUntil(proposal.validUntil);
    if (delta === null) return false;
    return PROPOSAL_REMINDER_DAYS.includes(delta);
};

const getInvoiceReminderCadenceKey = (invoice) => {
    const delta = daysUntil(invoice.dueDate);
    return delta === null ? `manual-${dayKey()}` : `due-${delta}`;
};

const getProposalReminderCadenceKey = (proposal) => {
    const delta = daysUntil(proposal.validUntil);
    return delta === null ? `manual-${dayKey()}` : `valid-${delta}`;
};

const cleanEmail = (value) => String(value || '').trim().toLowerCase();

const shouldCreateLog = async({ user, type, recipientEmail, resourceType, resourceId, cadenceKey, dryRun }) => {
    if (dryRun) return true;

    try {
        await NotificationLog.create({
            user,
            type,
            recipientEmail,
            resourceType,
            resourceId,
            cadenceKey,
            status: 'pending'
        });
        return true;
    } catch (err) {
        if (err?.code === 11000) return false;
        throw err;
    }
};

const updateLogSent = async({ type, recipientEmail, resourceId, cadenceKey }) => {
    await NotificationLog.findOneAndUpdate(
        {
            channel: 'email',
            type,
            recipientEmail,
            resourceId,
            cadenceKey
        },
        {
            status: 'sent',
            error: '',
            sentAt: new Date()
        },
        { upsert: false }
    ).catch(() => {});
};

const updateLogFailure = async({ type, recipientEmail, resourceId, cadenceKey, error }) => {
    await NotificationLog.findOneAndUpdate(
        {
            channel: 'email',
            type,
            recipientEmail,
            resourceId,
            cadenceKey
        },
        {
            status: 'failed',
            error: String(error?.message || error || 'Email failed').slice(0, 500)
        },
        { upsert: false }
    ).catch(() => {});
};

const buildUserDigestItems = ({ invoices = [], proposals = [], leads = [], projects = [] }) => {
    const items = [];

    invoices
        .filter((invoice) => invoice.status !== 'paid' && invoice.documentType !== 'proposal')
        .map((invoice) => ({ invoice, delta: daysUntil(invoice.dueDate) }))
        .filter(({ delta }) => delta !== null && delta <= 2)
        .sort((a, b) => {
            if (a.delta !== b.delta) return a.delta - b.delta;
            return Number(b.invoice.amount || 0) - Number(a.invoice.amount || 0);
        })
        .slice(0, 3)
        .forEach(({ invoice, delta }) => {
            const timing = delta < 0
                ? `overdue by ${Math.abs(delta)} day${Math.abs(delta) === 1 ? '' : 's'}`
                : delta === 0
                    ? 'due today'
                    : `due in ${delta} day${delta === 1 ? '' : 's'}`;
            items.push({
                title: `Collect payment from ${invoice.clientName}`,
                detail: `${invoice.invoiceNumber} is ${timing}. Amount: ${invoice.currency || 'INR'} ${Number(invoice.amount || 0).toLocaleString('en-IN')}.`
            });
        });

    proposals
        .filter((proposal) => proposal.documentType === 'proposal' && !['accepted', 'rejected', 'expired'].includes(String(proposal.proposalStatus || 'draft')))
        .map((proposal) => ({ proposal, delta: daysUntil(proposal.validUntil) }))
        .filter(({ delta }) => delta !== null && delta <= 2)
        .sort((a, b) => a.delta - b.delta)
        .slice(0, 3)
        .forEach(({ proposal, delta }) => {
            const status = String(proposal.proposalStatus || 'draft');
            const timing = delta < 0
                ? `validity passed ${Math.abs(delta)} day${Math.abs(delta) === 1 ? '' : 's'} ago`
                : delta === 0
                    ? 'valid until today'
                    : `valid for ${delta} more day${delta === 1 ? '' : 's'}`;
            items.push({
                title: status === 'draft' ? `Send proposal to ${proposal.clientName}` : `Follow up proposal with ${proposal.clientName}`,
                detail: `${proposal.invoiceNumber} is ${timing}. Amount: ${proposal.currency || 'INR'} ${Number(proposal.amount || 0).toLocaleString('en-IN')}.`
            });
        });

    leads
        .filter((lead) => lead.nextFollowUpAt && !['won', 'lost'].includes(lead.status))
        .map((lead) => ({ lead, delta: daysUntil(lead.nextFollowUpAt) }))
        .filter(({ delta }) => delta !== null && delta <= 0)
        .slice(0, 3)
        .forEach(({ lead }) => {
            items.push({
                title: `Follow up ${lead.businessName || lead.contactName || lead.email || 'a lead'}`,
                detail: lead.pain || 'Lead follow-up is due today. Open Lead Pipeline and send the next message.'
            });
        });

    projects
        .flatMap((project) => (project.tasks || [])
            .filter((task) => !['done', 'completed'].includes(String(task.status || '').toLowerCase()))
            .map((task) => ({ project, task, delta: daysUntil(task.dueDate) })))
        .filter(({ delta }) => delta !== null && delta <= 0)
        .slice(0, 3)
        .forEach(({ project, task }) => {
            items.push({
                title: `Project task due: ${task.title}`,
                detail: `${project.title || 'Client Workroom'} needs attention. Owner: ${task.owner || 'not assigned'}.`
            });
        });

    return items;
};

router.get('/automation/status', (req, res) => {
    res.json({
        enabled: boolEnv('AUTOMATION_NOTIFICATIONS_ENABLED', true),
        clientEmails: boolEnv('AUTOMATION_NOTIFY_CLIENTS', true),
        userDigests: boolEnv('AUTOMATION_NOTIFY_USERS', true),
        cronSecretConfigured: Boolean(process.env.CRON_SECRET),
        invoiceReminderDays: INVOICE_REMINDER_DAYS,
        proposalReminderDays: PROPOSAL_REMINDER_DAYS,
        endpoint: '/api/notifications/automation/run'
    });
});

router.post('/automation/run', async(req, res) => {
    const secret = process.env.CRON_SECRET;
    const provided = req.headers['x-cron-secret'] || req.query?.secret;

    if (!secret) {
        return res.status(500).json({ message: 'CRON_SECRET is not configured' });
    }

    if (provided !== secret) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!boolEnv('AUTOMATION_NOTIFICATIONS_ENABLED', true)) {
        return res.json({ message: 'Automation notifications are disabled.', processed: 0, sent: 0 });
    }

    const dryRun = String(req.query?.dryRun || '').toLowerCase() === 'true';
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit || 50)));
    const result = {
        dryRun,
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        clientReminders: 0,
        userDigests: 0,
        errors: []
    };

    if (boolEnv('AUTOMATION_NOTIFY_CLIENTS', true)) {
        const candidateInvoices = await Invoice.find({
            documentType: { $ne: 'proposal' },
            status: { $ne: 'paid' },
            clientEmail: { $nin: [null, ''] },
            dueDate: { $ne: null }
        })
            .populate('user', 'companyName name email')
            .sort({ dueDate: 1 })
            .limit(limit)
            .lean();

        for (const invoice of candidateInvoices.filter(isInvoiceReminderDay)) {
            result.processed += 1;

            const recipientEmail = cleanEmail(invoice.clientEmail);
            const cadenceKey = getInvoiceReminderCadenceKey(invoice);
            const logContext = {
                user: invoice.user?._id || invoice.user || null,
                type: 'client_invoice_reminder',
                recipientEmail,
                resourceType: 'invoice',
                resourceId: invoice._id,
                cadenceKey,
                dryRun
            };

            try {
                const shouldSend = await shouldCreateLog(logContext);
                if (!shouldSend) {
                    result.skipped += 1;
                    continue;
                }

                if (!dryRun) {
                    const publicLink = invoice.paymentLink?.shortUrl || getPublicInvoiceUrl(process.env.FRONTEND_URL, invoice._id);
                    const senderName = invoice.user?.companyName || invoice.user?.name || DEFAULT_COMPANY_NAME;
                    const template = invoiceReminder({ invoice, publicUrl: publicLink, senderName });
                    await sendEmail(recipientEmail, template.subject, template);
                    await updateLogSent(logContext);
                }

                result.sent += 1;
                result.clientReminders += 1;
            } catch (err) {
                result.failed += 1;
                result.errors.push({ type: 'client_invoice_reminder', invoiceId: invoice._id, message: err.message });
                await updateLogFailure({ ...logContext, error: err });
            }
        }

        const candidateProposals = await Invoice.find({
            documentType: 'proposal',
            proposalStatus: 'sent',
            clientEmail: { $nin: [null, ''] },
            validUntil: { $ne: null }
        })
            .populate('user', 'companyName name email')
            .sort({ validUntil: 1 })
            .limit(limit)
            .lean();

        for (const proposal of candidateProposals.filter(isProposalReminderDay)) {
            result.processed += 1;

            const recipientEmail = cleanEmail(proposal.clientEmail);
            const cadenceKey = getProposalReminderCadenceKey(proposal);
            const logContext = {
                user: proposal.user?._id || proposal.user || null,
                type: 'client_proposal_reminder',
                recipientEmail,
                resourceType: 'proposal',
                resourceId: proposal._id,
                cadenceKey,
                dryRun
            };

            try {
                const shouldSend = await shouldCreateLog(logContext);
                if (!shouldSend) {
                    result.skipped += 1;
                    continue;
                }

                if (!dryRun) {
                    const publicLink = getPublicInvoiceUrl(process.env.FRONTEND_URL, proposal._id);
                    const senderName = proposal.user?.companyName || proposal.user?.name || DEFAULT_COMPANY_NAME;
                    const template = proposalReminder({ invoice: proposal, publicUrl: publicLink, senderName });
                    await sendEmail(recipientEmail, template.subject, template);
                    await updateLogSent(logContext);
                }

                result.sent += 1;
                result.clientReminders += 1;
            } catch (err) {
                result.failed += 1;
                result.errors.push({ type: 'client_proposal_reminder', proposalId: proposal._id, message: err.message });
                await updateLogFailure({ ...logContext, error: err });
            }
        }
    }

    if (boolEnv('AUTOMATION_NOTIFY_USERS', true)) {
        const users = await User.find({
            role: { $ne: 'admin' },
            email: { $nin: [null, ''] }
        })
            .select('name companyName email')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        const todayKey = dayKey();

        for (const user of users) {
            result.processed += 1;
            let logContext = null;

            try {
                const [invoices, proposals, leads, projects] = await Promise.all([
                    Invoice.find({ user: user._id, documentType: { $ne: 'proposal' }, status: { $ne: 'paid' } })
                        .select('documentType status clientName invoiceNumber amount currency dueDate')
                        .sort({ dueDate: 1 })
                        .limit(25)
                        .lean(),
                    Invoice.find({
                        user: user._id,
                        documentType: 'proposal',
                        proposalStatus: { $nin: ['accepted', 'rejected', 'expired'] },
                        validUntil: { $ne: null }
                    })
                        .select('documentType proposalStatus clientName invoiceNumber amount currency validUntil')
                        .sort({ validUntil: 1 })
                        .limit(15)
                        .lean(),
                    Lead.find({ user: user._id, nextFollowUpAt: { $ne: null }, status: { $nin: ['won', 'lost'] } })
                        .select('businessName contactName email pain status nextFollowUpAt')
                        .sort({ nextFollowUpAt: 1 })
                        .limit(15)
                        .lean(),
                    TeamProject.find({ user: user._id, status: { $nin: ['completed', 'paused'] } })
                        .select('title tasks status')
                        .sort({ updatedAt: -1 })
                        .limit(10)
                        .lean()
                ]);

                const items = buildUserDigestItems({ invoices, proposals, leads, projects });
                if (!items.length) {
                    result.skipped += 1;
                    continue;
                }

                const recipientEmail = cleanEmail(user.email);
                logContext = {
                    user: user._id,
                    type: 'user_daily_digest',
                    recipientEmail,
                    resourceType: 'user',
                    resourceId: user._id,
                    cadenceKey: todayKey,
                    dryRun
                };
                const shouldSend = await shouldCreateLog(logContext);
                if (!shouldSend) {
                    result.skipped += 1;
                    continue;
                }

                if (!dryRun) {
                    const dashboardUrl = `${String(process.env.FRONTEND_URL || 'https://www.clientflowai.in').replace(/\/+$/, '')}/dashboard`;
                    const template = userDailyDigest({ user, items, dashboardUrl });
                    await sendEmail(recipientEmail, template.subject, template);
                    await updateLogSent(logContext);
                }

                result.sent += 1;
                result.userDigests += 1;
            } catch (err) {
                result.failed += 1;
                result.errors.push({ type: 'user_daily_digest', userId: user._id, message: err.message });
                if (logContext) {
                    await updateLogFailure({ ...logContext, error: err });
                }
            }
        }
    }

    res.json({
        message: dryRun ? 'Automation dry run completed.' : 'Automation notifications completed.',
        ...result
    });
});

module.exports = router;
