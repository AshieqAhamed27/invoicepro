const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Lead = require('../models/Lead');
const Client = require('../models/Client');
const { protect } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// Helper: build a Date range object from a period string
// ---------------------------------------------------------------------------
function getDateRange(period) {
  const now = new Date();
  let start;

  switch (period) {
    case 'week':
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;
    case 'quarter':
      start = new Date(now);
      start.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
      start = new Date(0); // epoch
      break;
    case 'month':
    default:
      start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      break;
  }

  return { start, end: now };
}

// ---------------------------------------------------------------------------
// Helper: get the start of a month N months ago
// ---------------------------------------------------------------------------
function monthsAgo(n) {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - n);
  return d;
}

// ---------------------------------------------------------------------------
// Helper: format a Date as "Mon YYYY" (e.g. "Oct 2026")
// ---------------------------------------------------------------------------
function formatMonthLabel(year, month) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// GET /summary — Master revenue dashboard summary
// ---------------------------------------------------------------------------
router.get('/summary', protect, async (req, res) => {
  try {
    res.set('Cache-Control', 'private, max-age=300');

    const period = ['week', 'month', 'quarter', 'year', 'all'].includes(req.query.period)
      ? req.query.period
      : 'month';

    const { start, end } = getDateRange(period);
    const userId = req.user._id;
    const now = new Date();

    // ── 1. Invoice aggregation for the selected period ──────────────────────
    const invoiceAggPromise = Invoice.aggregate([
      {
        $match: {
          user: userId,
          documentType: 'invoice',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $facet: {
          revenue: [
            {
              $group: {
                _id: null,
                total: { $sum: '$amount' },
                paid: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0],
                  },
                },
                pending: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$status', 'pending'] },
                          { $gte: ['$dueDate', now] },
                        ],
                      },
                      '$amount',
                      0,
                    ],
                  },
                },
                overdue: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$status', 'pending'] },
                          { $lt: ['$dueDate', now] },
                        ],
                      },
                      '$amount',
                      0,
                    ],
                  },
                },
                overdueCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$status', 'pending'] },
                          { $lt: ['$dueDate', now] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                paidCount: {
                  $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
                },
                pendingCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$status', 'pending'] },
                          { $gte: ['$dueDate', now] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                totalCount: { $sum: 1 },
              },
            },
          ],
          proposals: [
            {
              $match: { documentType: 'proposal' },
            },
            { $count: 'count' },
          ],
          topClients: [
            { $match: { status: 'paid' } },
            {
              $group: {
                _id: '$clientEmail',
                name: { $first: '$clientName' },
                totalPaid: { $sum: '$amount' },
                invoiceCount: { $sum: 1 },
              },
            },
            { $sort: { totalPaid: -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 0,
                name: 1,
                totalPaid: 1,
                invoiceCount: 1,
              },
            },
          ],
          avgPaymentDays: [
            {
              $match: {
                status: 'paid',
                paidAt: { $exists: true },
              },
            },
            {
              $project: {
                daysToPay: {
                  $divide: [
                    { $subtract: ['$paidAt', '$createdAt'] },
                    1000 * 60 * 60 * 24,
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                avg: { $avg: '$daysToPay' },
              },
            },
          ],
        },
      },
    ]);

    // ── 2. Proposal count (documentType = 'proposal', same period) ──────────
    const proposalCountPromise = Invoice.countDocuments({
      user: userId,
      documentType: 'proposal',
      createdAt: { $gte: start, $lte: end },
    });

    // ── 3. Lead aggregation ──────────────────────────────────────────────────
    const leadAggPromise = Lead.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
          totalBudgetWon: {
            $sum: {
              $cond: [{ $eq: ['$status', 'won'] }, { $ifNull: ['$budget', 0] }, 0],
            },
          },
        },
      },
    ]);

    // ── 4. Client counts ─────────────────────────────────────────────────────
    const clientTotalPromise = Client.countDocuments({ user: userId });
    const clientActivePromise = Invoice.distinct('clientEmail', {
      user: userId,
      createdAt: { $gte: start, $lte: end },
    });

    // ── 5. Monthly trend — always last 6 months ──────────────────────────────
    const trendStart = monthsAgo(5); // 6 months including current
    const monthlyTrendPromise = Invoice.aggregate([
      {
        $match: {
          user: userId,
          documentType: 'invoice',
          createdAt: { $gte: trendStart },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          invoiced: { $sum: '$amount' },
          paid: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // ── Run all in parallel ──────────────────────────────────────────────────
    const [
      invoiceAggResult,
      proposalCount,
      leadAggResult,
      clientTotal,
      activeClientEmails,
      trendResult,
    ] = await Promise.all([
      invoiceAggPromise,
      proposalCountPromise,
      leadAggPromise,
      clientTotalPromise,
      clientActivePromise,
      monthlyTrendPromise,
    ]);

    // ── Unpack invoice facet ─────────────────────────────────────────────────
    const facet = invoiceAggResult[0] || {};
    const rev = (facet.revenue && facet.revenue[0]) || {
      total: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      overdueCount: 0,
      paidCount: 0,
      pendingCount: 0,
      totalCount: 0,
    };
    const topClients = facet.topClients || [];
    const avgPayDaysArr = facet.avgPaymentDays || [];
    const avgPaymentDays =
      avgPayDaysArr.length > 0 ? Math.round(avgPayDaysArr[0].avg) : 0;

    const totalInvoices = rev.totalCount;
    const paidInvoices = rev.paidCount;
    const pendingInvoices = rev.pendingCount;
    const overdueInvoices = rev.overdueCount;
    const conversionRate =
      totalInvoices > 0 ? parseFloat((paidInvoices / totalInvoices).toFixed(2)) : 0;
    const avgInvoiceValue =
      totalInvoices > 0 ? Math.round(rev.total / totalInvoices) : 0;

    // ── Unpack lead facet ────────────────────────────────────────────────────
    const leadData = leadAggResult[0] || {
      total: 0,
      won: 0,
      lost: 0,
      totalBudgetWon: 0,
    };
    const inProgress = leadData.total - leadData.won - leadData.lost;
    const winRate =
      leadData.total > 0
        ? parseFloat((leadData.won / leadData.total).toFixed(2))
        : 0;

    // ── Monthly trend formatting ─────────────────────────────────────────────
    const monthlyTrend = trendResult.map((entry) => ({
      month: formatMonthLabel(entry._id.year, entry._id.month),
      paid: entry.paid,
      invoiced: entry.invoiced,
    }));

    res.json({
      period,
      revenue: {
        total: rev.total,
        paid: rev.paid,
        pending: rev.pending,
        overdue: rev.overdue,
        overdueCount: rev.overdueCount,
      },
      invoices: {
        total: totalInvoices,
        paid: paidInvoices,
        pending: pendingInvoices,
        overdue: overdueInvoices,
        proposals: proposalCount,
        conversionRate,
      },
      leads: {
        total: leadData.total,
        won: leadData.won,
        lost: leadData.lost,
        inProgress,
        winRate,
        totalBudgetWon: leadData.totalBudgetWon,
      },
      clients: {
        total: clientTotal,
        activeThisPeriod: activeClientEmails.length,
      },
      topClients,
      monthlyTrend,
      avgInvoiceValue,
      avgPaymentDays,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard summary', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /timeline — Unified activity feed of payments + won leads
// ---------------------------------------------------------------------------
router.get('/timeline', protect, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 10));
    const userId = req.user._id;

    // Fetch paid invoices and won leads in parallel (generous fetch, then slice)
    const fetchSize = page * limit + limit; // over-fetch so we can paginate after merge

    const [paidInvoices, wonLeads] = await Promise.all([
      Invoice.find({ user: userId, status: 'paid' })
        .sort({ paidAt: -1 })
        .limit(fetchSize)
        .select('clientName amount currency paidAt createdAt')
        .lean(),
      Lead.find({ user: userId, status: 'won' })
        .sort({ updatedAt: -1 })
        .limit(fetchSize)
        .select('businessName budget updatedAt createdAt')
        .lean(),
    ]);

    // Normalise into a unified event shape
    const invoiceEvents = paidInvoices.map((inv) => ({
      type: 'payment_received',
      date: inv.paidAt || inv.createdAt,
      clientName: inv.clientName,
      amount: inv.amount,
      currency: inv.currency,
    }));

    const leadEvents = wonLeads.map((lead) => ({
      type: 'lead_won',
      date: lead.updatedAt || lead.createdAt,
      businessName: lead.businessName,
      budget: lead.budget,
    }));

    // Merge and sort by date descending
    const all = [...invoiceEvents, ...leadEvents].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    const total = all.length;
    const skip = (page - 1) * limit;
    const events = all.slice(skip, skip + limit);

    res.json({ events, total, page, limit });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch timeline', error: err.message });
  }
});

module.exports = router;
