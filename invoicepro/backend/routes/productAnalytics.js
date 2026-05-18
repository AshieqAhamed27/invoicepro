const express = require('express');
const jwt = require('jsonwebtoken');
const ProductAnalyticsEvent = require('../models/ProductAnalyticsEvent');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { getJwtSecret } = require('../utils/env');

const router = express.Router();

const PAID_PLANS = ['pro', 'monthly', 'yearly', 'founder90'];
const FREE_ACCESS_PLANS = ['free', 'trial', 'early_access'];

const limitText = (value, maxLength) => {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
};

const normalizeEventName = (value) => {
    const safeName = limitText(value || 'event', 80)
        .toLowerCase()
        .replace(/[^a-z0-9_.:-]/g, '_')
        .replace(/_+/g, '_');

    return safeName || 'event';
};

const getAuthUser = async(req) => {
    try {
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) return null;

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, getJwtSecret());
        if (!decoded?.id) return null;

        return await User.findById(decoded.id)
            .select('plan role subscriptionStatus')
            .lean();
    } catch (err) {
        return null;
    }
};

const requireAdmin = (req, res) => {
    if (req.user?.role === 'admin') return true;
    res.status(403).json({ message: 'Forbidden' });
    return false;
};

const countUnique = async(match, field) => {
    const query = { ...match };

    if (!query[field]) {
        query[field] = field === 'user'
            ? { $ne: null }
            : { $nin: [null, ''] };
    }

    const values = await ProductAnalyticsEvent.distinct(field, query);

    return values.length;
};

const countFirstSeen = async(match, field, since) => {
    const identityFilter = field === 'user'
        ? { $ne: null }
        : { $nin: [null, ''] };

    const result = await ProductAnalyticsEvent.aggregate([
        {
            $match: {
                ...match,
                [field]: identityFilter
            }
        },
        {
            $group: {
                _id: `$${field}`,
                firstSeenAt: { $min: '$createdAt' }
            }
        },
        {
            $match: {
                firstSeenAt: { $gte: since }
            }
        },
        { $count: 'count' }
    ]);

    return Number(result[0]?.count || 0);
};

router.post('/event', async(req, res) => {
    try {
        const visitorId = limitText(req.body?.visitorId, 100);
        if (!visitorId) {
            return res.status(400).json({ message: 'visitorId is required' });
        }

        const user = await getAuthUser(req);
        const eventName = normalizeEventName(req.body?.eventName);

        await ProductAnalyticsEvent.create({
            eventName,
            visitorId,
            user: user?._id || null,
            plan: user?.plan || '',
            role: user?.role || '',
            path: limitText(req.body?.path, 240),
            title: limitText(req.body?.title, 160),
            referrer: limitText(req.body?.referrer, 300),
            userAgent: limitText(req.headers['user-agent'], 300)
        });

        res.status(201).json({ ok: true });
    } catch (err) {
        console.error('PRODUCT ANALYTICS EVENT ERROR:', err.message);
        res.status(500).json({ message: 'Unable to save product analytics event' });
    }
});

router.get('/admin/summary', protect, async(req, res) => {
    try {
        if (!requireAdmin(req, res)) return;

        const now = new Date();
        const last30Days = new Date(now);
        last30Days.setDate(last30Days.getDate() - 30);

        const last7Days = new Date(now);
        last7Days.setDate(last7Days.getDate() - 7);

        const pageViewMatch = {
            eventName: 'page_view',
            role: { $ne: 'admin' }
        };
        const memberUseMatch = {
            role: { $ne: 'admin' },
            user: { $ne: null }
        };

        const [
            rawProductViews,
            uniqueProductViewers,
            newVisitors7d,
            uniqueVisitors7d,
            usersWhoUsedProduct,
            activeMembers30d,
            newMembers7d,
            userSummary,
            recentActivity
        ] = await Promise.all([
            ProductAnalyticsEvent.countDocuments(pageViewMatch),
            countUnique(pageViewMatch, 'visitorId'),
            countFirstSeen(pageViewMatch, 'visitorId', last7Days),
            countUnique({ ...pageViewMatch, createdAt: { $gte: last7Days } }, 'visitorId'),
            countUnique(memberUseMatch, 'user'),
            countUnique({ ...memberUseMatch, createdAt: { $gte: last30Days } }, 'user'),
            countFirstSeen(memberUseMatch, 'user', last7Days),
            User.aggregate([
                {
                    $group: {
                        _id: null,
                        registeredMembers: {
                            $sum: { $cond: [{ $ne: ['$role', 'admin'] }, 1, 0] }
                        },
                        freeAccessMembers: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $ne: ['$role', 'admin'] },
                                            { $in: [{ $ifNull: ['$plan', 'free'] }, FREE_ACCESS_PLANS] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        paidMembers: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $ne: ['$role', 'admin'] },
                                            { $in: ['$plan', PAID_PLANS] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        trialMembers: {
                            $sum: {
                                $cond: [
                                    { $and: [{ $ne: ['$role', 'admin'] }, { $eq: ['$plan', 'trial'] }] },
                                    1,
                                    0
                                ]
                            }
                        },
                        earlyAccessMembers: {
                            $sum: {
                                $cond: [
                                    { $and: [{ $ne: ['$role', 'admin'] }, { $eq: ['$plan', 'early_access'] }] },
                                    1,
                                    0
                                ]
                            }
                        },
                        adminMembers: {
                            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
                        }
                    }
                }
            ]),
            ProductAnalyticsEvent.aggregate([
                {
                    $match: {
                        ...pageViewMatch,
                        visitorId: { $nin: [null, ''] }
                    }
                },
                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: '$visitorId',
                        event: { $first: '$$ROOT' }
                    }
                },
                { $replaceRoot: { newRoot: '$event' } },
                { $sort: { createdAt: -1 } },
                { $limit: 8 },
                {
                    $project: {
                        path: 1,
                        title: 1,
                        visitorId: 1,
                        user: 1,
                        plan: 1,
                        createdAt: 1
                    }
                }
            ])
        ]);

        const members = userSummary[0] || {
            registeredMembers: 0,
            freeAccessMembers: 0,
            paidMembers: 0,
            trialMembers: 0,
            earlyAccessMembers: 0,
            adminMembers: 0
        };

        const registeredMembers = Number(members.registeredMembers || 0);
        const paidMembers = Number(members.paidMembers || 0);

        res.json({
            totals: {
                productViews: uniqueProductViewers,
                rawProductViews,
                uniqueVisitors: uniqueProductViewers,
                newProductViewers: uniqueProductViewers,
                usersWhoUsedProduct,
                activeMembers30d,
                newMembers7d,
                registeredMembers,
                freeAccessMembers: Number(members.freeAccessMembers || 0),
                paidMembers,
                trialMembers: Number(members.trialMembers || 0),
                earlyAccessMembers: Number(members.earlyAccessMembers || 0),
                adminMembers: Number(members.adminMembers || 0),
                paidConversionRate: registeredMembers > 0
                    ? Math.round((paidMembers / registeredMembers) * 1000) / 10
                    : 0
            },
            last7Days: {
                productViews: newVisitors7d,
                newVisitors: newVisitors7d,
                uniqueVisitors: uniqueVisitors7d,
                newMembers: newMembers7d
            },
            recentActivity: recentActivity.map((event) => ({
                id: event._id,
                path: event.path,
                title: event.title,
                plan: event.plan || 'visitor',
                createdAt: event.createdAt
            }))
        });
    } catch (err) {
        console.error('PRODUCT ANALYTICS SUMMARY ERROR:', err.message);
        res.status(500).json({ message: 'Unable to load product analytics' });
    }
});

module.exports = router;
