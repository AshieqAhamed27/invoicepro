const express = require('express');
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

const buildReminder = (invoice) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontendUrl}/public/invoice/${invoice._id}`;

    return `Hi ${invoice.clientName}, quick reminder for invoice ${invoice.invoiceNumber} of ${formatCurrency(invoice.amount)} due on ${formatDate(invoice.dueDate)}. You can review and pay here: ${link}. Thank you.`;
};

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
