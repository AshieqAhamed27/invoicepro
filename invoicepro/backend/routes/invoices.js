const express = require('express');
const Invoice = require('../models/Invoice');
const RecurringInvoice = require('../models/RecurringInvoice');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const {
    addDays,
    computeNextRunAt,
    diffDaysUTC,
    getPublicInvoiceUrl,
    parseDateInput
} = require('../utils/recurrence');

const router = express.Router();
const sendEmail = require('../utils/sendEmail');
const {
    invoiceCreated,
    invoiceReminder,
    paymentConfirmed
} = require('../utils/emailTemplates');

const FREE_PLAN_LIMIT = 2;

// Generate invoice number
const generateInvoiceNumber = async(userId) => {
    const lastInvoice = await Invoice.findOne({ user: userId }).sort({ createdAt: -1 });
    if (!lastInvoice) return 'INV-0001';

    const lastNumMatch = lastInvoice.invoiceNumber.match(/(\d+)$/);
    const lastNum = lastNumMatch ? parseInt(lastNumMatch[1]) : 0;
    const nextNum = String(lastNum + 1).padStart(4, '0');
    return `INV-${nextNum}`;
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
        const [statsResult, invoices, trends] = await Promise.all([
            Invoice.aggregate([
                { $match: { user: req.user._id } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
                        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                        paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
                        total: { $sum: 1 }
                    }
                }
            ]),
            Invoice.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10).lean(),
            Invoice.aggregate([
                { $match: { user: req.user._id, status: 'paid' } },
                {
                    $group: {
                        _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
                        amount: { $sum: '$amount' }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } },
                { $limit: 6 }
            ])
        ]);

        const stats = statsResult[0] || { totalRevenue: 0, pending: 0, paid: 0, total: 0 };

        res.json({
            invoices,
            stats: {
                totalRevenue: stats.totalRevenue || 0,
                pending: stats.pending || 0,
                paid: stats.paid || 0,
                total: stats.total || 0,
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
        const invoice = await Invoice.findById(req.params.id)
            .populate('user', 'companyName upiId address logo');

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

        if (user.plan === 'free' && count >= FREE_PLAN_LIMIT) {
            return res.status(403).json({
                message: 'Free plan limit reached',
                limitReached: true
            });
        }

        const invoiceNumber = await generateInvoiceNumber(user._id);

        const {
            clientName,
            clientEmail,
            serviceDescription,
            amount,
            currency,
            date,
            dueDate,
            notes,
            logo,
            items,
            gst,
            cgst,
            sgst,
            upiId,
            recurring
        } = req.body;

        if (!clientName || !clientEmail || !amount) {
            return res.status(400).json({
                message: 'Missing required fields'
            });
        }

        const invoice = await Invoice.create({
            clientName,
            clientEmail,
            serviceDescription: serviceDescription || '',
            amount: Number(amount),
            currency: currency || 'INR',
            date: date || new Date(),
            dueDate: dueDate || null,
            notes: notes || '',
            logo: logo || null,
            items: items || [],
            gst: gst || '',
            cgst: Number(cgst) || 0,
            sgst: Number(sgst) || 0,
            upiId: upiId || '',
            invoiceNumber,
            user: user._id,

            // ✅ FIXED STATUS SYSTEM
            status: 'pending',
            paidAt: null
        });

        let recurringInvoice = null;
        let recurringError = null;

        if (recurring && recurring.enabled) {
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

        console.log('Invoice created:', invoice._id);

        res.status(201).json({ invoice, recurringInvoice, recurringError });

        // Send email in background
        setImmediate(async() => {
            try {
                const publicInvoiceLink = getPublicInvoiceUrl(process.env.FRONTEND_URL, invoice._id);

                const senderName = user.companyName || user.name || 'InvoicePro';
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

// ==========================
// UPDATE STATUS (FIXED)
// ==========================
router.put('/:id/status', protect, async(req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                message: 'Invoice not found.'
            });
        }

        if (invoice.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: 'Unauthorized action'
            });
        }

        const { status } = req.body;

        if (!['pending', 'paid'].includes(status)) {
            return res.status(400).json({
                message: 'Invalid status'
            });
        }

        const previousStatus = invoice.status;

        invoice.status = status;

        if (status === 'paid') {
            invoice.paidAt = new Date();
        }

        await invoice.save();

        res.json({
            message: 'Status updated!',
            invoice
        });

        if (previousStatus !== 'paid' && status === 'paid') {
            setImmediate(async() => {
                try {
                    const publicUrl = getPublicInvoiceUrl(process.env.FRONTEND_URL, invoice._id);
                    const senderName = req.user.companyName || req.user.name || 'InvoicePro';
                    const template = paymentConfirmed({ invoice, publicUrl, senderName });
                    await sendEmail(invoice.clientEmail, template.subject, template);
                } catch (e) {}
            });
        }

    } catch (err) {
        console.error('UPDATE STATUS ERROR:', err);

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
            { $match: { user: req.user._id } },
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
        const schedule = await RecurringInvoice.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!schedule) {
            return res.status(404).json({ message: 'Recurring invoice not found' });
        }

        const invoiceCount = await Invoice.countDocuments({ user: req.user._id });
        if (req.user.plan === 'free' && invoiceCount >= FREE_PLAN_LIMIT) {
            return res.status(403).json({
                message: 'Free plan limit reached',
                limitReached: true
            });
        }

        const runAt = new Date();
        const invoiceNumber = await generateInvoiceNumber(req.user._id);

        const dueDate = schedule.template?.dueDays !== null && schedule.template?.dueDays !== undefined
            ? addDays(runAt, schedule.template.dueDays)
            : null;

        const invoice = await Invoice.create({
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
                    const senderName = req.user.companyName || req.user.name || 'InvoicePro';
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
            const user = await User.findById(schedule.user).select('plan companyName name');
            if (!user) {
                schedule.status = 'paused';
                schedule.pauseReason = 'user_missing';
                await schedule.save();
                continue;
            }

            const invoiceCount = await Invoice.countDocuments({ user: schedule.user });
            if (user.plan === 'free' && invoiceCount >= FREE_PLAN_LIMIT) {
                schedule.status = 'paused';
                schedule.pauseReason = 'plan_limit_reached';
                await schedule.save();
                continue;
            }

            const runAt = schedule.nextRunAt;
            const invoiceNumber = await generateInvoiceNumber(schedule.user);

            const dueDate = schedule.template?.dueDays !== null && schedule.template?.dueDays !== undefined
                ? addDays(runAt, schedule.template.dueDays)
                : null;

            const invoice = await Invoice.create({
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
                        const senderName = user.companyName || user.name || 'InvoicePro';
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
        const invoice = await Invoice.findOne({
            _id: req.params.id,
            user: req.user._id
        });

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
        const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user._id });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        if (invoice.status === 'paid') return res.status(400).json({ message: 'Already paid' });

        const publicLink = getPublicInvoiceUrl(process.env.FRONTEND_URL, invoice._id);

        const senderName = req.user.companyName || req.user.name || 'InvoicePro';
        const template = invoiceReminder({ invoice, publicUrl: publicLink, senderName });
        await sendEmail(invoice.clientEmail, template.subject, template);

        res.json({ message: 'Reminder sent successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
