/**
 * Admin User Management Routes
 * Allows admin to: upgrade, extend trial, downgrade, ban users, send individual emails
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const { planActivated, trialExpiryWarning, diwaliCampaign } = require('../utils/emailTemplates');

// ─── Middleware: Admin only ───────────────────────────────────────────────────
const adminOnly = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required.' });
        }
        next();
    } catch (err) {
        next(err);
    }
};

// ─── GET /admin/users — List all users ──────────────────────────────────────
router.get('/users', protect, adminOnly, async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
        const skip  = (page - 1) * limit;

        const filter = {};
        if (req.query.plan)   filter.plan   = req.query.plan;
        if (req.query.search) {
            const q = String(req.query.search).trim();
            filter.$or = [
                { name:  { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } }
            ];
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('name email plan planExpiresAt createdAt role isBanned trialStartedAt earlyAccessStartedAt persona')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter)
        ]);

        res.json({ users, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── POST /admin/users/:id/upgrade — Manually upgrade user to Pro ────────────
router.post('/users/:id/upgrade', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const { plan = 'monthly', days = 30 } = req.body;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + Number(days));

        user.plan            = plan;
        user.planExpiresAt   = expiresAt;
        user.planStartedAt   = user.planStartedAt || new Date();
        user.subscriptionProvider = 'manual_admin';
        user.subscriptionStatus   = 'active';
        await user.save();

        // Send confirmation email
        try {
            const { subject, html, text } = planActivated({
                user,
                planLabel: plan === 'monthly' ? 'Pro Monthly' : plan === 'yearly' ? 'Pro Annual' : 'Pro',
                amount: null,
                dashboardUrl: `${process.env.FRONTEND_URL || 'https://www.clientflowai.in'}/client-flow`
            });
            await sendEmail(user.email, subject, { html, text });
        } catch (emailErr) {
            console.error('Admin upgrade email error:', emailErr.message);
        }

        res.json({ message: `User upgraded to ${plan} for ${days} days.`, user: { id: user._id, plan: user.plan, planExpiresAt: user.planExpiresAt } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── POST /admin/users/:id/extend-trial — Extend free trial ─────────────────
router.post('/users/:id/extend-trial', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const extraDays = Number(req.body.days || 30);
        const baseDate  = user.earlyAccessStartedAt || user.trialStartedAt || new Date();
        const currentExpiry = new Date(baseDate);
        currentExpiry.setDate(currentExpiry.getDate() + 30); // original 30-day trial

        // Extend from today or current expiry, whichever is later
        const extendFrom = currentExpiry > new Date() ? currentExpiry : new Date();
        extendFrom.setDate(extendFrom.getDate() + extraDays);

        user.earlyAccessStartedAt = user.earlyAccessStartedAt || new Date(Date.now() - extraDays * 24 * 60 * 60 * 1000);
        user.planExpiresAt = extendFrom;
        await user.save();

        res.json({ message: `Trial extended by ${extraDays} days. New expiry: ${extendFrom.toDateString()}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── POST /admin/users/:id/downgrade — Downgrade user to free ───────────────
router.post('/users/:id/downgrade', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        user.plan                 = 'free';
        user.planExpiresAt        = null;
        user.subscriptionStatus   = 'cancelled';
        await user.save();

        res.json({ message: 'User downgraded to free plan.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── POST /admin/users/:id/ban — Ban/unban user ──────────────────────────────
router.post('/users/:id/ban', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        user.isBanned = !user.isBanned;
        await user.save();

        res.json({ message: user.isBanned ? 'User banned.' : 'User unbanned.', isBanned: user.isBanned });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── POST /admin/users/:id/email — Send custom email to user ────────────────
router.post('/users/:id/email', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('name email');
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const { subject, message } = req.body;
        if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required.' });

        const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
            <p style="font-size:14px;color:#374151;line-height:1.6;">${String(message).replace(/\n/g, '<br/>')}</p>
          </div>
          <p style="margin-top:16px;font-size:12px;color:#9ca3af;text-align:center;">Sent by ClientFlow AI Admin</p>
        </div>`;

        await sendEmail(user.email, subject, { html, text: message });
        res.json({ message: `Email sent to ${user.email}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── GET /admin/email/test — Live test of email credentials ─────────────────
router.get('/email/test', protect, adminOnly, async (req, res) => {
    try {
        const emailUser = String(process.env.EMAIL_USER || '').trim();
        const emailPass = String(process.env.EMAIL_PASS || '').replace(/\s+/g, '');
        const resendKey = String(process.env.RESEND_API_KEY || '').trim();

        const diagnostics = {
            hasEmailUser: Boolean(emailUser),
            emailUser: emailUser ? `${emailUser.slice(0, 3)}***${emailUser.slice(emailUser.indexOf('@'))}` : 'NOT_SET',
            hasEmailPass: Boolean(emailPass),
            emailPassLength: emailPass.length,
            hasResendKey: Boolean(resendKey),
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587
        };

        const targetEmail = req.user.email || 'ashieqahamed4@gmail.com';
        await sendEmail(
            targetEmail,
            '✅ ClientFlow AI Email Test',
            {
                html: '<p style="font-family:sans-serif;font-size:15px;color:#333;">Your email sending configuration is <strong>working 100%</strong>!</p>',
                text: 'Your email sending configuration is working 100%!'
            }
        );

        res.json({
            ok: true,
            message: `Test email successfully delivered to ${targetEmail}!`,
            diagnostics
        });
    } catch (err) {
        res.status(500).json({
            ok: false,
            message: err.message,
            code: err.code,
            command: err.command,
            diagnostics: {
                hasEmailUser: Boolean(process.env.EMAIL_USER),
                emailUserLength: (process.env.EMAIL_USER || '').length,
                hasEmailPass: Boolean(process.env.EMAIL_PASS),
                emailPassLength: (process.env.EMAIL_PASS || '').length,
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: process.env.EMAIL_PORT || 587
            }
        });
    }
});

// ─── POST /admin/email/diwali-campaign — Send Diwali offer to all free users ─
router.post('/email/diwali-campaign', protect, adminOnly, async (req, res) => {
    try {
        const now = new Date();
        const offerEnd = new Date('2026-11-15T23:59:59+05:30');
        if (now > offerEnd) return res.status(400).json({ message: 'Diwali offer has ended.' });

        // Find all active free-trial users who haven't been emailed yet about Diwali
        const freeUsers = await User.find({
            plan: { $in: ['free', null, undefined] },
            email: { $exists: true, $ne: '' },
            diwaliEmailSent: { $ne: true }
        }).select('name email diwaliEmailSent').limit(500).lean();

        if (freeUsers.length === 0) {
            return res.json({ message: 'No eligible users to email (all already sent or no free users).', sent: 0 });
        }

        const upgradeUrl = `${process.env.FRONTEND_URL || 'https://www.clientflowai.in'}/checkout/monthly`;
        let sent = 0;
        let failed = 0;
        let firstError = null;

        // Send in batches to avoid rate limiting
        for (const u of freeUsers) {
            try {
                const { subject, html, text } = diwaliCampaign({ user: u, upgradeUrl });
                await sendEmail(u.email, subject, { html, text });
                await User.updateOne({ _id: u._id }, { diwaliEmailSent: true, diwaliEmailSentAt: new Date() });
                sent++;
                // Small delay between emails
                await new Promise(r => setTimeout(r, 300));
            } catch (e) {
                console.error(`Diwali email failed for ${u.email}:`, e.message);
                if (!firstError) firstError = e.message;
                failed++;
            }
        }

        res.json({ message: `Diwali campaign sent.`, sent, failed, total: freeUsers.length, error: firstError });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── GET /admin/revenue/summary — Revenue stats for admin ───────────────────
router.get('/revenue/summary', protect, adminOnly, async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

        const [totalUsers, paidUsers, freeUsers, recentPaid] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ plan: { $in: ['monthly', 'yearly', 'founder90'] } }),
            User.countDocuments({ plan: { $in: ['free', null, undefined] } }),
            User.countDocuments({
                plan: { $in: ['monthly', 'yearly', 'founder90'] },
                planStartedAt: { $gte: thirtyDaysAgo }
            })
        ]);

        // Simple MRR estimate based on plan types
        const monthlyUsers = await User.countDocuments({ plan: 'monthly', planExpiresAt: { $gte: now } });
        const yearlyUsers  = await User.countDocuments({ plan: 'yearly',  planExpiresAt: { $gte: now } });
        const founder90    = await User.countDocuments({ plan: 'founder90', planExpiresAt: { $gte: now } });

        const MONTHLY_PRICE = Number(process.env.PRO_MONTHLY_AMOUNT || 499);
        const YEARLY_PRICE  = Number(process.env.PRO_YEARLY_AMOUNT  || 4999);
        const FOUNDER_PRICE = Number(process.env.FOUNDER_90_AMOUNT  || 799);

        const mrr = (monthlyUsers * MONTHLY_PRICE) + (yearlyUsers * Math.round(YEARLY_PRICE / 12)) + (founder90 * Math.round(FOUNDER_PRICE / 3));
        const conversionRate = totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : '0.0';

        res.json({
            totalUsers,
            paidUsers,
            freeUsers,
            recentPaid,
            mrr,
            conversionRate,
            activeMonthly: monthlyUsers,
            activeYearly:  yearlyUsers,
            activeFounder: founder90
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
