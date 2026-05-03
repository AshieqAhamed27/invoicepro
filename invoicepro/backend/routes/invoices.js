const express = require('express');
const Invoice = require('../models/Invoice');
const RecurringInvoice = require('../models/RecurringInvoice');
const User = require('../models/User');
const Lead = require('../models/Lead');
const { protect } = require('../middleware/auth');
const {
    addDays,
    computeNextRunAt,
    diffDaysUTC,
    getPublicInvoiceUrl,
    parseDateInput
} = require('../utils/recurrence');
const { isValidObjectId, rejectInvalidObjectId } = require('../utils/objectId');

const router = express.Router();
const sendEmail = require('../utils/sendEmail');
const {
    invoiceCreated,
    invoiceReminder
} = require('../utils/emailTemplates');

const FREE_PLAN_LIMIT = 2;
const DEFAULT_COMPANY_NAME = 'InvoicePro Billing Technologies';

const isProposalDocument = (value) => String(value || 'invoice').toLowerCase() === 'proposal';

const isPaidPlan = (user) => user?.plan && user.plan !== 'free';

const getValidSourceLead = async(sourceLeadId, userId) => {
    if (!isValidObjectId(sourceLeadId)) return null;

    return Lead.findOne({
        _id: sourceLeadId,
        user: userId
    });
};

const markProposalLeadWon = async(proposal) => {
    if (!proposal?.sourceLeadId) return null;

    return Lead.findOneAndUpdate(
        {
            _id: proposal.sourceLeadId,
            user: proposal.user?._id || proposal.user
        },
        {
            status: 'won',
            nextFollowUpAt: null
        },
        { new: true }
    );
};

const buildBusinessSnapshot = (user, details = {}) => ({
    name: user.companyName || DEFAULT_COMPANY_NAME,
    email: user.email || '',
    address: user.address || '',
    gstNumber: details.gst || user.gstNumber || '',
    upiId: details.upiId || user.upiId || '',
    logo: user.logo || '/logo.svg'
});

const getInvoiceDocumentMatch = (documentType) => (
    isProposalDocument(documentType)
        ? { documentType: 'proposal' }
        : { documentType: { $ne: 'proposal' } }
);

// Generate billing document number
const generateDocumentNumber = async(userId, documentType = 'invoice') => {
    const lastInvoice = await Invoice.findOne({
        user: userId,
        ...getInvoiceDocumentMatch(documentType)
    }).sort({ createdAt: -1 });

    const prefix = isProposalDocument(documentType) ? 'PRO' : 'INV';
    if (!lastInvoice) return `${prefix}-0001`;

    const lastNumMatch = lastInvoice.invoiceNumber.match(/(\d+)$/);
    const lastNum = lastNumMatch ? parseInt(lastNumMatch[1]) : 0;
    const nextNum = String(lastNum + 1).padStart(4, '0');
    return `${prefix}-${nextNum}`;
};

const generateInvoiceNumber = (userId) => generateDocumentNumber(userId, 'invoice');

const isDatePastEndOfDay = (value) => {
    if (!value) return false;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    date.setHours(23, 59, 59, 999);
    return date < new Date();
};

const getPaymentPromiseStatus = (promisedDate, currentStatus = 'open') => {
    if (!promisedDate) return 'cleared';
    if (currentStatus === 'kept' || currentStatus === 'cleared') return currentStatus;
    return isDatePastEndOfDay(promisedDate) ? 'missed' : 'open';
};

// ==========================
// GET ALL INVOICES
// ==========================
router.get('/', protect, async(req, res) => {
    try {
        const invoices = await Invoice.find({
            user: req.user._id
        }).sort({ createdAt: -1 });

        res.json({
            invoices,
            count: invoices.length
        });

    } catch (err) {
        console.error('GET INVOICES ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

// ==========================
// DASHBOARD SUMMARY
// ==========================
router.get('/dashboard', protect, async(req, res) => {
    try {
        const [statsResult, invoices, trends, paymentLinkCount] = await Promise.all([
            Invoice.aggregate([
                { $match: { user: req.user._id, documentType: { $ne: 'proposal' } } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
                        pendingAmount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
                        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                        paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
                        total: { $sum: 1 }
                    }
                }
            ]),
            Invoice.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10).lean(),
            Invoice.aggregate([
                { $match: { user: req.user._id, documentType: { $ne: 'proposal' }, status: 'paid' } },
                {
                    $group: {
                        _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
                        amount: { $sum: '$amount' }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } },
                { $limit: 6 }
            ]),
            Invoice.countDocuments({
                user: req.user._id,
                documentType: { $ne: 'proposal' },
                'paymentLink.shortUrl': { $nin: ['', null] }
            })
        ]);

        const stats = statsResult[0] || { totalRevenue: 0, pending: 0, paid: 0, total: 0 };

        res.json({
            invoices,
            stats: {
                totalRevenue: stats.totalRevenue || 0,
                pendingAmount: stats.pendingAmount || 0,
                pending: stats.pending || 0,
                paid: stats.paid || 0,
                total: stats.total || 0,
                paymentLinks: paymentLinkCount || 0,
                trends: trends.map(t => ({
                    label: new Date(t._id.year, t._id.month - 1).toLocaleString('default', { month: 'short' }),
                    value: t.amount
                })).reverse()
            }
        });

    } catch (err) {
        console.error('DASHBOARD INVOICES ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

// ==========================
// PUBLIC INVOICE VIEW
// ==========================
router.get('/public/:id', async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'invoice');
        }

        const invoice = await Invoice.findById(req.params.id)
            .populate('user', 'companyName name email gstNumber upiId address logo');

        if (!invoice) {
            return res.status(404).json({
                message: 'Invoice not found.'
            });
        }

        res.json({ invoice });

    } catch (err) {
        console.error('PUBLIC INVOICE ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

router.post('/public/:id/accept', async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'proposal');
        }

        const proposal = await Invoice.findById(req.params.id)
            .populate('user', 'companyName name');

        if (!proposal || !isProposalDocument(proposal.documentType)) {
            return res.status(404).json({
                message: 'Proposal not found.'
            });
        }

        if (proposal.proposalStatus === 'accepted') {
            const sourceLead = await markProposalLeadWon(proposal);
            return res.json({
                message: 'Proposal already accepted.',
                proposal,
                lead: sourceLead
            });
        }

        if (isDatePastEndOfDay(proposal.validUntil)) {
            proposal.proposalStatus = 'expired';
            await proposal.save();
            return res.status(400).json({
                message: 'This proposal has expired.',
                proposal
            });
        }

        proposal.proposalStatus = 'accepted';
        proposal.proposalAcceptedAt = new Date();
        proposal.proposalRejectedAt = null;
        await proposal.save();

        const sourceLead = await markProposalLeadWon(proposal);

        res.json({
            message: 'Proposal accepted successfully.',
            proposal,
            lead: sourceLead
        });
    } catch (err) {
        console.error('PUBLIC PROPOSAL ACCEPT ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});



// ==========================
// CREATE INVOICE
// ==========================
router.post('/', protect, async(req, res) => {
    try {
        const user = req.user;

        if (!user || !user._id) {
            return res.status(401).json({
                message: 'Unauthorized'
            });
        }

        const count = await Invoice.countDocuments({
            user: user._id
        });

        if (!isPaidPlan(user) && count >= FREE_PLAN_LIMIT) {
            return res.status(403).json({
                message: 'Free plan limit reached',
                limitReached: true
            });
        }

        const {
            documentType,
            clientName,
            clientEmail,
            serviceDescription,
            amount,
            currency,
            date,
            dueDate,
            validUntil,
            notes,
            logo,
            items,
            gst,
            cgst,
            sgst,
            upiId,
            sourceLeadId,
            recurring
        } = req.body;

        if (!clientName || !clientEmail || !amount) {
            return res.status(400).json({
                message: 'Missing required fields'
            });
        }

        const normalizedDocumentType = isProposalDocument(documentType) ? 'proposal' : 'invoice';
        const finalUpiId = normalizedDocumentType === 'invoice' ? (upiId || user.upiId || '') : '';
        const sourceLead = await getValidSourceLead(sourceLeadId, user._id);

        if (normalizedDocumentType === 'invoice' && recurring?.enabled && !isPaidPlan(user)) {
            return res.status(403).json({
                message: 'Recurring invoices are a Pro feature.',
                upgradeRequired: true
            });
        }

        const invoiceNumber = await generateDocumentNumber(user._id, normalizedDocumentType);

        const invoice = await Invoice.create({
            documentType: normalizedDocumentType,
            clientName,
            clientEmail,
            serviceDescription: serviceDescription || '',
            amount: Number(amount),
            currency: currency || 'INR',
            date: date || new Date(),
            dueDate: normalizedDocumentType === 'invoice' ? (dueDate || null) : null,
            validUntil: normalizedDocumentType === 'proposal' ? (validUntil || null) : null,
            notes: notes || '',
            logo: logo || null,
            items: items || [],
            gst: gst || '',
            cgst: Number(cgst) || 0,
            sgst: Number(sgst) || 0,
            upiId: finalUpiId,
            businessSnapshot: buildBusinessSnapshot(user, {
                gst,
                upiId: finalUpiId
            }),
            invoiceNumber,
            user: user._id,
            proposalStatus: normalizedDocumentType === 'proposal' ? 'sent' : null,
            sourceLeadId: sourceLead?._id || null,

            // ✅ FIXED STATUS SYSTEM
            status: 'pending',
            paidAt: null
        });

        if (sourceLead && normalizedDocumentType === 'proposal') {
            sourceLead.status = 'proposal_sent';
            sourceLead.lastContactedAt = sourceLead.lastContactedAt || new Date();
            await sourceLead.save();
        }

        let recurringInvoice = null;
        let recurringError = null;

        if (normalizedDocumentType === 'invoice' && recurring && recurring.enabled) {
            const frequency = String(recurring.frequency || 'monthly').toLowerCase();
            const interval = Math.max(1, Number(recurring.interval || 1));

            if (!['weekly', 'monthly'].includes(frequency)) {
                recurringError = 'Invalid recurring frequency';
            } else {
                const startDate = parseDateInput(recurring.startDate) || invoice.date || new Date();
                const dayOfMonth = frequency === 'monthly'
                    ? Math.min(31, Math.max(1, Number(recurring.dayOfMonth || startDate.getUTCDate())))
                    : null;

                const endDate = parseDateInput(recurring.endDate);
                const maxRuns = recurring.maxRuns ? Math.max(1, Number(recurring.maxRuns)) : null;
                const sendEmailOnEach = recurring.sendEmail !== false;

                const dueDays = invoice.dueDate ? diffDaysUTC(startDate, new Date(invoice.dueDate)) : null;

                const nextRunAt = computeNextRunAt({
                    from: startDate,
                    frequency,
                    interval,
                    dayOfMonth
                });

                try {
                    recurringInvoice = await RecurringInvoice.create({
                        user: user._id,
                        frequency,
                        interval,
                        dayOfMonth,
                        startDate,
                        nextRunAt,
                        endDate: endDate || null,
                        maxRuns,
                        sendEmail: sendEmailOnEach,
                        lastInvoiceId: invoice._id,
                        createdFromInvoiceId: invoice._id,
                        template: {
                            clientName: invoice.clientName,
                            clientEmail: invoice.clientEmail,
                            serviceDescription: invoice.serviceDescription || '',
                            items: invoice.items || [],
                            amount: invoice.amount,
                            currency: invoice.currency || 'INR',
                            gst: invoice.gst || '',
                            cgst: Number(invoice.cgst) || 0,
                            sgst: Number(invoice.sgst) || 0,
                            upiId: invoice.upiId || '',
                            notes: invoice.notes || '',
                            dueDays
                        }
                    });
                } catch (err) {
                    recurringError = err.message || 'Failed to enable recurring invoices';
                }
            }
        }

        console.log('Billing document created:', invoice._id);

        res.status(201).json({ invoice, recurringInvoice, recurringError });

        // Send email in background
        setImmediate(async() => {
            try {
                const publicInvoiceLink = getPublicInvoiceUrl(process.env.FRONTEND_URL, invoice._id);

                const senderName = user.companyName || DEFAULT_COMPANY_NAME;
                const template = invoiceCreated({ invoice, publicUrl: publicInvoiceLink, senderName });

                await sendEmail(invoice.clientEmail, template.subject, template);

            } catch (e) {
                console.log('Email failed in background');
            }
        });

    } catch (err) {
        console.error('CREATE INVOICE ERROR:', err);

        res.status(500).json({
            message: err.message || 'Server error'
        });
    }
});

router.post('/:id/convert', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'proposal');
        }

        const proposal = await Invoice.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!proposal) {
            return res.status(404).json({
                message: 'Proposal not found.'
            });
        }

        if (!isProposalDocument(proposal.documentType)) {
            return res.status(400).json({
                message: 'Only proposals can be converted.'
            });
        }

        if (proposal.proposalStatus !== 'accepted') {
            return res.status(400).json({
                message: 'Only accepted proposals can be converted.'
            });
        }

        if (proposal.convertedToInvoiceId) {
            const existingInvoice = await Invoice.findOne({
                _id: proposal.convertedToInvoiceId,
                user: req.user._id
            });

            if (existingInvoice) {
                return res.json({
                    message: 'Proposal already converted.',
                    invoice: existingInvoice,
                    proposal
                });
            }
        }

        const invoiceNumber = await generateDocumentNumber(req.user._id, 'invoice');
        const proposalSnapshot = proposal.businessSnapshot || {};
        const hasProposalSnapshot = Boolean(
            proposalSnapshot.name ||
            proposalSnapshot.email ||
            proposalSnapshot.address ||
            proposalSnapshot.gstNumber ||
            proposalSnapshot.upiId ||
            proposalSnapshot.logo
        );
        const finalUpiId = proposal.upiId || proposalSnapshot.upiId || req.user.upiId || '';
        const invoice = await Invoice.create({
            documentType: 'invoice',
            clientName: proposal.clientName,
            clientEmail: proposal.clientEmail,
            serviceDescription: proposal.serviceDescription || '',
            amount: Number(proposal.amount || 0),
            currency: proposal.currency || 'INR',
            date: new Date(),
            dueDate: addDays(new Date(), 7),
            notes: proposal.notes || '',
            items: proposal.items || [],
            gst: proposal.gst || '',
            cgst: Number(proposal.cgst) || 0,
            sgst: Number(proposal.sgst) || 0,
            upiId: finalUpiId,
            businessSnapshot: hasProposalSnapshot
                ? { ...proposalSnapshot, upiId: finalUpiId }
                : buildBusinessSnapshot(req.user, {
                    gst: proposal.gst,
                    upiId: finalUpiId
                }),
            invoiceNumber,
            user: req.user._id,
            status: 'pending',
            paidAt: null,
            sourceProposalId: proposal._id,
            sourceLeadId: proposal.sourceLeadId || null
        });

        proposal.convertedToInvoiceId = invoice._id;
        proposal.convertedAt = new Date();
        await proposal.save();

        res.status(201).json({
            message: 'Proposal converted to invoice.',
            invoice,
            proposal
        });
    } catch (err) {
        console.error('CONVERT PROPOSAL ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

// ==========================
// UPDATE STATUS
// ==========================
router.put('/:id/status', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'invoice');
        }

        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                message: 'Invoice not found.'
            });
        }

        const isOwner = invoice.user.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                message: 'Unauthorized action'
            });
        }

        if (isProposalDocument(invoice.documentType)) {
            return res.status(400).json({
                message: 'Proposals cannot be marked as paid.'
            });
        }

        const { status } = req.body;

        if (!['pending', 'paid'].includes(status)) {
            return res.status(400).json({
                message: 'Invalid status'
            });
        }

        if (status === 'paid' && !isAdmin) {
            return res.status(403).json({
                message: 'Invoices can be marked paid only after verified payment.'
            });
        }

        invoice.status = status;

        if (status === 'paid') {
            invoice.paidAt = new Date();
        } else {
            invoice.paidAt = null;
        }

        await invoice.save();

        res.json({
            message: 'Status updated!',
            invoice
        });

    } catch (err) {
        console.error('UPDATE STATUS ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

router.patch('/:id/payment-promise', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'invoice');
        }

        const invoice = await Invoice.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!invoice) {
            return res.status(404).json({
                message: 'Invoice not found.'
            });
        }

        if (isProposalDocument(invoice.documentType)) {
            return res.status(400).json({
                message: 'Promise-to-pay can be set only on invoices.'
            });
        }

        if (invoice.status === 'paid') {
            return res.status(400).json({
                message: 'This invoice is already paid.'
            });
        }

        const promisedDate = parseDateInput(req.body?.promisedDate);
        const note = String(req.body?.note || '').trim().slice(0, 240);

        if (!promisedDate) {
            invoice.paymentPromise = {
                promisedDate: null,
                note: '',
                status: 'cleared',
                updatedAt: new Date()
            };
        } else {
            invoice.paymentPromise = {
                promisedDate,
                note,
                status: getPaymentPromiseStatus(promisedDate),
                updatedAt: new Date()
            };
        }

        await invoice.save();

        res.json({
            message: promisedDate ? 'Promise-to-pay saved.' : 'Promise-to-pay cleared.',
            invoice
        });
    } catch (err) {
        console.error('PAYMENT PROMISE ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

// ==========================
// DELETE INVOICE
// ==========================
router.delete('/:id', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'invoice');
        }

        const invoice = await Invoice.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!invoice) {
            return res.status(404).json({
                message: 'Invoice not found.'
            });
        }

        res.json({
            message: 'Invoice deleted.'
        });

    } catch (err) {
        console.error('DELETE ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

// ==========================
// GET UNIQUE CLIENTS (CRM)
// ==========================
router.get('/clients', protect, async(req, res) => {
    try {
        const clients = await Invoice.aggregate([
            { $match: { user: req.user._id, documentType: { $ne: 'proposal' } } },
            {
                $group: {
                    _id: '$clientEmail',
                    name: { $first: '$clientName' },
                    email: { $first: '$clientEmail' },
                    totalInvoiced: { $sum: '$amount' },
                    invoiceCount: { $sum: 1 },
                    lastInvoiced: { $max: '$createdAt' }
                }
            },
            { $sort: { lastInvoiced: -1 } }
        ]);

        res.json(clients);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==========================
// RECURRING INVOICES
// ==========================
router.get('/recurring', protect, async(req, res) => {
    try {
        const schedules = await RecurringInvoice.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ schedules });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.patch('/recurring/:id', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'recurring invoice');
        }

        const schedule = await RecurringInvoice.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!schedule) {
            return res.status(404).json({ message: 'Recurring invoice not found' });
        }

        const { status, sendEmail: sendEmailEnabled } = req.body;

        if (status !== undefined) {
            if (!['active', 'paused'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }

            schedule.status = status;

            if (status === 'active') {
                schedule.pauseReason = '';
            }
        }

        if (sendEmailEnabled !== undefined) {
            schedule.sendEmail = Boolean(sendEmailEnabled);
        }

        await schedule.save();
        res.json({ schedule });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/recurring/:id/run-now', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'recurring invoice');
        }

        const schedule = await RecurringInvoice.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!schedule) {
            return res.status(404).json({ message: 'Recurring invoice not found' });
        }

        if (!isPaidPlan(req.user)) {
            return res.status(403).json({
                message: 'Recurring invoices are a Pro feature.',
                upgradeRequired: true
            });
        }

        const runAt = new Date();
        const invoiceNumber = await generateInvoiceNumber(req.user._id);

        const dueDate = schedule.template?.dueDays !== null && schedule.template?.dueDays !== undefined
            ? addDays(runAt, schedule.template.dueDays)
            : null;

        const invoice = await Invoice.create({
            documentType: 'invoice',
            clientName: schedule.template.clientName,
            clientEmail: schedule.template.clientEmail,
            serviceDescription: schedule.template.serviceDescription || '',
            amount: Number(schedule.template.amount || 0),
            currency: schedule.template.currency || 'INR',
            date: runAt,
            dueDate,
            notes: schedule.template.notes || '',
            items: schedule.template.items || [],
            gst: schedule.template.gst || '',
            cgst: Number(schedule.template.cgst) || 0,
            sgst: Number(schedule.template.sgst) || 0,
            upiId: schedule.template.upiId || '',
            businessSnapshot: buildBusinessSnapshot(req.user, {
                gst: schedule.template.gst,
                upiId: schedule.template.upiId
            }),
            invoiceNumber,
            user: req.user._id,
            status: 'pending',
            paidAt: null
        });

        schedule.lastRunAt = runAt;
        schedule.lastInvoiceId = invoice._id;
        schedule.runCount += 1;
        schedule.pauseReason = '';
        schedule.lastError = '';
        schedule.nextRunAt = computeNextRunAt({
            from: runAt,
            frequency: schedule.frequency,
            interval: schedule.interval,
            dayOfMonth: schedule.dayOfMonth
        });

        if (schedule.maxRuns && schedule.runCount >= schedule.maxRuns) {
            schedule.status = 'paused';
            schedule.pauseReason = 'max_runs_reached';
        }

        if (schedule.endDate && schedule.nextRunAt > schedule.endDate) {
            schedule.status = 'paused';
            schedule.pauseReason = schedule.pauseReason || 'end_date_reached';
        }

        await schedule.save();

        if (schedule.sendEmail) {
            setImmediate(async() => {
                try {
                    const publicInvoiceLink = getPublicInvoiceUrl(process.env.FRONTEND_URL, invoice._id);
                    const senderName = req.user.companyName || DEFAULT_COMPANY_NAME;
                    const template = invoiceCreated({ invoice, publicUrl: publicInvoiceLink, senderName });
                    await sendEmail(invoice.clientEmail, template.subject, template);
                } catch (e) {}
            });
        }

        res.status(201).json({ invoice, schedule });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/recurring/run', async(req, res) => {
    const secret = process.env.CRON_SECRET;
    const provided = req.headers['x-cron-secret'] || req.query?.secret;

    if (!secret) {
        return res.status(500).json({ message: 'CRON_SECRET is not configured' });
    }

    if (provided !== secret) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const now = new Date();
    const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 25)));

    const dueSchedules = await RecurringInvoice.find({
        status: 'active',
        nextRunAt: { $lte: now }
    }).sort({ nextRunAt: 1 }).limit(limit);

    let processed = 0;
    let created = 0;
    const errors = [];

    for (const schedule of dueSchedules) {
        processed += 1;

        try {
            const user = await User.findById(schedule.user).select('plan companyName name email address gstNumber upiId logo');
            if (!user) {
                schedule.status = 'paused';
                schedule.pauseReason = 'user_missing';
                await schedule.save();
                continue;
            }

            if (!isPaidPlan(user)) {
                schedule.status = 'paused';
                schedule.pauseReason = 'pro_plan_required';
                await schedule.save();
                continue;
            }

            const runAt = schedule.nextRunAt;
            const invoiceNumber = await generateInvoiceNumber(schedule.user);

            const dueDate = schedule.template?.dueDays !== null && schedule.template?.dueDays !== undefined
                ? addDays(runAt, schedule.template.dueDays)
                : null;

        const invoice = await Invoice.create({
                documentType: 'invoice',
                clientName: schedule.template.clientName,
                clientEmail: schedule.template.clientEmail,
                serviceDescription: schedule.template.serviceDescription || '',
                amount: Number(schedule.template.amount || 0),
                currency: schedule.template.currency || 'INR',
                date: runAt,
                dueDate,
                notes: schedule.template.notes || '',
                items: schedule.template.items || [],
                gst: schedule.template.gst || '',
                cgst: Number(schedule.template.cgst) || 0,
                sgst: Number(schedule.template.sgst) || 0,
                upiId: schedule.template.upiId || '',
                businessSnapshot: buildBusinessSnapshot(user, {
                    gst: schedule.template.gst,
                    upiId: schedule.template.upiId
                }),
                invoiceNumber,
                user: schedule.user,
                status: 'pending',
                paidAt: null
            });

            created += 1;

            schedule.lastRunAt = runAt;
            schedule.lastInvoiceId = invoice._id;
            schedule.runCount += 1;
            schedule.pauseReason = '';
            schedule.lastError = '';
            schedule.nextRunAt = computeNextRunAt({
                from: runAt,
                frequency: schedule.frequency,
                interval: schedule.interval,
                dayOfMonth: schedule.dayOfMonth
            });

            if (schedule.maxRuns && schedule.runCount >= schedule.maxRuns) {
                schedule.status = 'paused';
                schedule.pauseReason = 'max_runs_reached';
            }

            if (schedule.endDate && schedule.nextRunAt > schedule.endDate) {
                schedule.status = 'paused';
                schedule.pauseReason = schedule.pauseReason || 'end_date_reached';
            }

            await schedule.save();

            if (schedule.sendEmail) {
                setImmediate(async() => {
                    try {
                        const publicInvoiceLink = getPublicInvoiceUrl(process.env.FRONTEND_URL, invoice._id);
                        const senderName = user.companyName || DEFAULT_COMPANY_NAME;
                        const template = invoiceCreated({ invoice, publicUrl: publicInvoiceLink, senderName });
                        await sendEmail(invoice.clientEmail, template.subject, template);
                    } catch (e) {}
                });
            }
        } catch (err) {
            schedule.lastError = err.message || 'Failed to run schedule';
            await schedule.save().catch(() => {});
            errors.push({ id: schedule._id, message: schedule.lastError });
        }
    }

    res.json({ processed, created, errors });
});

// ==========================
// GET SINGLE INVOICE
// ==========================
router.get('/:id', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'invoice');
        }

        const invoice = await Invoice.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('user', 'companyName name email gstNumber upiId address logo');

        if (!invoice) {
            return res.status(404).json({
                message: 'Invoice not found.'
            });
        }

        res.json({ invoice });

    } catch (err) {
        console.error('GET SINGLE ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

// ==========================
// SEND REMINDER
// ==========================
router.post('/:id/reminder', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'invoice');
        }

        const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user._id });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        if (isProposalDocument(invoice.documentType)) return res.status(400).json({ message: 'Use the public proposal link to request approval' });
        if (invoice.status === 'paid') return res.status(400).json({ message: 'Already paid' });

        const publicLink = invoice.paymentLink?.shortUrl || getPublicInvoiceUrl(process.env.FRONTEND_URL, invoice._id);

        const senderName = req.user.companyName || DEFAULT_COMPANY_NAME;
        const template = invoiceReminder({ invoice, publicUrl: publicLink, senderName });
        await sendEmail(invoice.clientEmail, template.subject, template);

        res.json({ message: 'Reminder sent successfully' });
    } catch (err) {
        console.error('SEND REMINDER ERROR:', err.message);
        res.status(err.status || 500).json({ message: err.message || 'Reminder email failed' });
    }
});

module.exports = router;
