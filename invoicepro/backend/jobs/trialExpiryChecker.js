/**
 * Trial Expiry Checker — runs every 24 hours
 * Sends warning email to users whose trial expires in 3 days
 * Sends expired email to users whose trial just ended
 */

const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { trialExpiryWarning, planExpiredNotification } = require('../utils/emailTemplates');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.clientflowai.in';

const runTrialExpiryCheck = async () => {
    console.log('[TrialExpiry] Starting trial expiry check...');

    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
        // ── 1. Users whose trial expires in ~3 days (warning email) ──
        const expiringUsers = await User.find({
            plan: { $in: ['free', null, undefined] },
            $or: [
                { earlyAccessStartedAt: { $exists: true, $ne: null } },
                { trialStartedAt: { $exists: true, $ne: null } }
            ],
            trialWarningSent: { $ne: true },
            email: { $exists: true, $ne: '' }
        }).select('name email earlyAccessStartedAt trialStartedAt trialWarningSent').lean();

        let warnSent = 0;
        const upgradeUrl = `${FRONTEND_URL}/checkout/monthly`;

        for (const u of expiringUsers) {
            const startDate = u.earlyAccessStartedAt || u.trialStartedAt;
            if (!startDate) continue;

            const trialEnd = new Date(startDate);
            trialEnd.setDate(trialEnd.getDate() + 30);

            // Send warning if 3 days or fewer remain
            const daysLeft = Math.round((trialEnd - now) / (24 * 60 * 60 * 1000));

            if (daysLeft >= 1 && daysLeft <= 3) {
                try {
                    const { subject, html, text } = trialExpiryWarning({ user: u, daysLeft, upgradeUrl });
                    await sendEmail(u.email, subject, { html, text });
                    await User.updateOne({ _id: u._id }, { trialWarningSent: true, trialWarningSentAt: new Date() });
                    warnSent++;
                    await new Promise(r => setTimeout(r, 500));
                } catch (e) {
                    console.error(`[TrialExpiry] Warning email failed for ${u.email}:`, e.message);
                }
            }
        }

        // ── 2. Users whose trial just expired (send expired notification) ──
        const expiredUsers = await User.find({
            plan: { $in: ['free', null, undefined] },
            planExpiredEmailSent: { $ne: true },
            $or: [
                {
                    earlyAccessStartedAt: {
                        $lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
                        $gte: new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000)
                    }
                },
                {
                    trialStartedAt: {
                        $lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
                        $gte: new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000)
                    }
                }
            ],
            email: { $exists: true, $ne: '' }
        }).select('name email earlyAccessStartedAt trialStartedAt').lean();

        let expiredSent = 0;
        const renewUrl = `${FRONTEND_URL}/checkout/monthly`;

        for (const u of expiredUsers) {
            try {
                const { subject, html, text } = planExpiredNotification({
                    user: u,
                    planLabel: 'Free Trial',
                    daysExpired: 0,
                    isFreeAccess: true,
                    renewUrl
                });
                await sendEmail(u.email, subject, { html, text });
                await User.updateOne({ _id: u._id }, { planExpiredEmailSent: true, planExpiredEmailSentAt: new Date() });
                expiredSent++;
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                console.error(`[TrialExpiry] Expired email failed for ${u.email}:`, e.message);
            }
        }

        console.log(`[TrialExpiry] Done. Warning emails sent: ${warnSent}, Expired emails sent: ${expiredSent}`);
    } catch (err) {
        console.error('[TrialExpiry] Job failed:', err.message);
    }
};

/**
 * Start the job — runs immediately, then every 24 hours
 */
const startTrialExpiryJob = () => {
    // Run once on startup (after 10s delay to let DB connect)
    setTimeout(() => {
        runTrialExpiryCheck();
    }, 10000);

    // Then run every 24 hours
    const INTERVAL_MS = 24 * 60 * 60 * 1000;
    setInterval(() => {
        runTrialExpiryCheck();
    }, INTERVAL_MS);

    console.log('[TrialExpiry] Trial expiry checker scheduled (every 24h).');
};

module.exports = { startTrialExpiryJob, runTrialExpiryCheck };
