const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const https = require('https');

const { protect } = require('../middleware/auth');
const User = require('../models/User');
const PaymentRequest = require('../models/PaymentRequest');
const Invoice = require('../models/Invoice');
const BillingSubscription = require('../models/BillingSubscription');
const sendEmail = require('../utils/sendEmail');
const { paymentConfirmed } = require('../utils/emailTemplates');
const { getPublicInvoiceUrl } = require('../utils/recurrence');
const { isValidObjectId, rejectInvalidObjectId } = require('../utils/objectId');
const { PRICING_VERSION } = require('../utils/runtimeDiagnostics');

const DEFAULT_COMPANY_NAME = 'ClientFlow AI';

const allowedScreenshotTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: function(req, file, cb) {
        if (!allowedScreenshotTypes.has(file.mimetype)) {
            return cb(new Error('Screenshot must be an image file'));
        }

        cb(null, true);
    }
});

const getConfiguredAmount = (envName, fallback) => {
    const amount = Number(process.env[envName]);
    return Number.isFinite(amount) && amount > 0 ? amount : fallback;
};

const planDetails = {
    monthly: {
        amount: getConfiguredAmount('PRO_MONTHLY_AMOUNT', 499),
        label: 'Pro Monthly',
        durationDays: 30,
        subscriptionCycles: 120,
        planEnv: 'RAZORPAY_MONTHLY_PLAN_ID',
        amountEnv: 'PRO_MONTHLY_AMOUNT'
    },
    yearly: {
        amount: getConfiguredAmount('PRO_YEARLY_AMOUNT', 4999),
        label: 'Pro Annual',
        durationDays: 365,
        subscriptionCycles: 10,
        planEnv: 'RAZORPAY_YEARLY_PLAN_ID',
        amountEnv: 'PRO_YEARLY_AMOUNT'
    },
    founder90: {
        amount: getConfiguredAmount('FOUNDER_90_AMOUNT', 999),
        label: 'Founder 90 Days',
        durationDays: 90,
        subscriptionCycles: 1,
        planEnv: '',
        amountEnv: 'FOUNDER_90_AMOUNT',
        checkoutType: 'one_time'
    }
};

const normalizePlan = (plan) => {
    const safePlan = String(plan || '').toLowerCase();
    return planDetails[safePlan] ? safePlan : null;
};

const getRazorpaySubscriptionPlanId = (plan) => {
    const normalizedPlan = normalizePlan(plan);
    if (!normalizedPlan) return '';
    return process.env[planDetails[normalizedPlan].planEnv] || '';
};

const serializePlan = (id, details, overrides = {}) => ({
    id,
    amount: overrides.amount ?? details.amount,
    currency: overrides.currency || 'INR',
    label: overrides.label || details.label,
    durationDays: details.durationDays,
    period: overrides.period || (id === 'yearly' ? 'yearly' : id === 'founder90' ? '90_days' : 'monthly'),
    checkoutType: overrides.checkoutType || details.checkoutType || 'subscription',
    providerPlanId: overrides.providerPlanId || getRazorpaySubscriptionPlanId(id) || '',
    amountSource: overrides.amountSource || 'configured',
    subscriptionReady: details.checkoutType === 'one_time' || process.env.PAYMENT_SIMULATION === 'true' || Boolean(getRazorpaySubscriptionPlanId(id)),
    warning: overrides.warning || ''
});

const serializeUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    subscriptionProvider: user.subscriptionProvider,
    subscriptionStatus: user.subscriptionStatus,
    razorpaySubscriptionId: user.razorpaySubscriptionId,
    planStartedAt: user.planStartedAt,
    lastPaymentAt: user.lastPaymentAt,
    trialStartedAt: user.trialStartedAt,
    trialUsedAt: user.trialUsedAt,
    companyName: user.companyName,
    gstNumber: user.gstNumber,
    upiId: user.upiId,
    address: user.address,
    logo: user.logo
});

const unixToDate = (value) => value ? new Date(Number(value) * 1000) : null;

const getFallbackExpiry = (plan) => {
    const normalizedPlan = normalizePlan(plan);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (planDetails[normalizedPlan]?.durationDays || 30));
    return expiresAt;
};

const getRazorpayAuthHeader = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
};

const setUserPlan = async(user, plan, options = {}) => {
    const normalizedPlan = normalizePlan(plan);
    if (!normalizedPlan) {
        throw new Error('Invalid plan');
    }

    user.plan = normalizedPlan;
    user.planExpiresAt = options.expiresAt || getFallbackExpiry(normalizedPlan);
    user.subscriptionProvider = options.subscriptionProvider ?? user.subscriptionProvider;
    user.subscriptionStatus = options.subscriptionStatus ?? user.subscriptionStatus;
    user.razorpaySubscriptionId = options.subscriptionId ?? user.razorpaySubscriptionId;
    user.planStartedAt = options.planStartedAt || user.planStartedAt || new Date();
    user.lastPaymentAt = options.lastPaymentAt || user.lastPaymentAt;
    await user.save();
    return user;
};

const setUserFree = async(user, status = 'cancelled') => {
    user.plan = 'free';
    user.planExpiresAt = null;
    user.subscriptionStatus = status;
    user.subscriptionProvider = user.subscriptionProvider || 'razorpay';
    await user.save();
    return user;
};

const createRazorpayOrder = (payload, authHeader) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const req = https.request({
            hostname: 'api.razorpay.com',
            path: '/v1/orders',
            method: 'POST',
            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        body: body ? JSON.parse(body) : {}
                    });
                } catch (err) {
                    resolve({
                        ok: false,
                        status: res.statusCode || 500,
                        body: { message: body || 'Invalid Razorpay response' }
                    });
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
};

const requestRazorpay = ({ path, method = 'POST', payload = {}, authHeader }) => {
    return new Promise((resolve, reject) => {
        const hasBody = method !== 'GET' && payload && Object.keys(payload).length > 0;
        const data = hasBody ? JSON.stringify(payload) : '';
        const headers = {
            Authorization: authHeader
        };

        if (hasBody) {
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = Buffer.byteLength(data);
        }

        const req = https.request({
            hostname: 'api.razorpay.com',
            path,
            method,
            headers
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        body: body ? JSON.parse(body) : {}
                    });
                } catch (err) {
                    resolve({
                        ok: false,
                        status: res.statusCode || 500,
                        body: { message: body || 'Invalid Razorpay response' }
                    });
                }
            });
        });
        req.on('error', reject);
        if (hasBody) req.write(data);
        req.end();
    });
};

const amountFromRazorpayItem = (item = {}) => {
    const paise = Number(item.amount ?? item.unit_amount);
    if (!Number.isFinite(paise) || paise <= 0) return null;
    return paise / 100;
};

const resolvePlanPricing = async(normalizedPlan, options = {}) => {
    const details = planDetails[normalizedPlan];
    const providerPlanId = getRazorpaySubscriptionPlanId(normalizedPlan);
    const authHeader = getRazorpayAuthHeader();
    const fallback = serializePlan(normalizedPlan, details);
    const shouldFetchLivePlan = process.env.PAYMENT_SIMULATION !== 'true' && providerPlanId && authHeader;

    if (!shouldFetchLivePlan) {
        return fallback;
    }

    const razorpayRes = await requestRazorpay({
        path: `/v1/plans/${encodeURIComponent(providerPlanId)}`,
        method: 'GET',
        authHeader
    });

    if (!razorpayRes.ok) {
        if (options.requireLive) {
            throw new Error(getRazorpayErrorMessage(razorpayRes.body) || 'Unable to verify Razorpay plan amount');
        }

        return serializePlan(normalizedPlan, details, {
            warning: 'Could not fetch live Razorpay plan amount. Showing configured fallback amount.'
        });
    }

    const liveAmount = amountFromRazorpayItem(razorpayRes.body?.item);
    if (!liveAmount) {
        if (options.requireLive) {
            throw new Error('Razorpay plan amount is missing or invalid');
        }

        return serializePlan(normalizedPlan, details, {
            warning: 'Razorpay plan amount is missing. Showing configured fallback amount.'
        });
    }

    return serializePlan(normalizedPlan, details, {
        amount: liveAmount,
        currency: razorpayRes.body?.item?.currency || 'INR',
        label: razorpayRes.body?.item?.name || details.label,
        period: razorpayRes.body?.period || fallback.period,
        providerPlanId,
        amountSource: 'razorpay'
    });
};

const resolveAllPlanPricing = async() => Promise.all(
    Object.keys(planDetails).map((id) => resolvePlanPricing(id))
);

const mapSubscriptionEntity = (entity = {}) => ({
    providerPlanId: entity.plan_id || '',
    status: entity.status || 'created',
    currentStart: unixToDate(entity.current_start),
    currentEnd: unixToDate(entity.current_end),
    chargeAt: unixToDate(entity.charge_at),
    endedAt: unixToDate(entity.ended_at),
    totalCount: entity.total_count ?? null,
    paidCount: entity.paid_count || 0,
    remainingCount: entity.remaining_count ?? null,
    customerId: entity.customer_id || '',
    shortUrl: entity.short_url || '',
    raw: entity
});

const normalizeNotes = (notes) => {
    if (!notes || Array.isArray(notes)) return {};
    return typeof notes === 'object' ? notes : {};
};

const getPaymentLinkPaymentId = (paymentLinkEntity = {}, paymentEntity = null) => {
    if (paymentEntity?.id) return paymentEntity.id;
    if (paymentLinkEntity.payment_id) return paymentLinkEntity.payment_id;

    const payments = Array.isArray(paymentLinkEntity.payments) ? paymentLinkEntity.payments : [];
    return payments.find((payment) => payment?.payment_id)?.payment_id || '';
};

const mapPaymentLinkEntity = (entity = {}, paymentEntity = null) => ({
    provider: 'razorpay',
    providerPaymentLinkId: entity.id || '',
    shortUrl: entity.short_url || '',
    status: entity.status || '',
    amount: Number(entity.amount || 0) / 100,
    currency: entity.currency || 'INR',
    createdAt: unixToDate(entity.created_at),
    paidAt: unixToDate(entity.paid_at) || (entity.status === 'paid' ? new Date() : null),
    paymentId: getPaymentLinkPaymentId(entity, paymentEntity),
    raw: entity
});

const isReusablePaymentLink = (paymentLink = {}) => {
    if (!paymentLink.shortUrl || !paymentLink.providerPaymentLinkId) return false;
    return !['paid', 'cancelled', 'expired'].includes(String(paymentLink.status || '').toLowerCase());
};

const appendInvoicePaymentEvent = (invoice, event = {}) => {
    invoice.paymentEvents = invoice.paymentEvents || [];

    const eventType = event.type || 'payment.event';
    const providerPaymentId = event.providerPaymentId || '';
    const providerPaymentLinkId = event.providerPaymentLinkId || '';
    const hasDuplicate = invoice.paymentEvents.some((existing) => (
        existing.type === eventType &&
        (
            (providerPaymentId && existing.providerPaymentId === providerPaymentId) ||
            (!providerPaymentId && providerPaymentLinkId && existing.providerPaymentLinkId === providerPaymentLinkId)
        )
    ));

    if (hasDuplicate) return;

    invoice.paymentEvents.push({
        type: eventType,
        provider: event.provider || 'razorpay',
        providerPaymentId,
        providerPaymentLinkId,
        status: event.status || '',
        amount: Number(event.amount || invoice.amount || 0),
        currency: event.currency || invoice.currency || 'INR',
        message: event.message || '',
        occurredAt: event.occurredAt || new Date()
    });
};

const sendInvoicePaymentConfirmation = (invoice) => {
    setImmediate(async() => {
        try {
            const publicUrl = getPublicInvoiceUrl(process.env.FRONTEND_URL, invoice._id);
            const senderName = invoice.user?.companyName || DEFAULT_COMPANY_NAME;
            const template = paymentConfirmed({ invoice, publicUrl, senderName });

            await sendEmail(invoice.clientEmail, template.subject, template);

            const ownerEmail = invoice.user?.email;
            if (ownerEmail && ownerEmail !== invoice.clientEmail) {
                await sendEmail(ownerEmail, template.subject, template);
            }
        } catch (e) {}
    });
};

const markInvoicePaidFromPayment = async(invoice, options = {}) => {
    const previousStatus = invoice.status;
    invoice.status = 'paid';
    invoice.paidAt = invoice.paidAt || new Date();
    const paymentId = options.paymentId || getPaymentLinkPaymentId(options.paymentLinkEntity || {}, options.paymentEntity);
    const paymentLinkId = options.paymentLinkEntity?.id || invoice.paymentLink?.providerPaymentLinkId || '';

    if (options.paymentLinkEntity) {
        invoice.paymentLink = {
            ...(invoice.paymentLink?.toObject ? invoice.paymentLink.toObject() : invoice.paymentLink || {}),
            ...mapPaymentLinkEntity(options.paymentLinkEntity, options.paymentEntity)
        };
    } else if (options.paymentId) {
        invoice.paymentLink = {
            ...(invoice.paymentLink?.toObject ? invoice.paymentLink.toObject() : invoice.paymentLink || {}),
            paymentId,
            paidAt: invoice.paidAt,
            status: 'paid'
        };
    }

    appendInvoicePaymentEvent(invoice, {
        type: options.eventType || (options.paymentLinkEntity ? 'payment_link.paid' : 'payment.captured'),
        providerPaymentId: paymentId,
        providerPaymentLinkId: paymentLinkId,
        status: 'paid',
        amount: Number(options.paymentEntity?.amount || options.paymentLinkEntity?.amount || 0) / 100 || invoice.amount,
        currency: options.paymentEntity?.currency || options.paymentLinkEntity?.currency || invoice.currency || 'INR',
        message: 'Verified Razorpay payment received.',
        occurredAt: invoice.paidAt
    });

    await invoice.save();

    if (previousStatus !== 'paid') {
        sendInvoicePaymentConfirmation(invoice);
    }

    return invoice;
};

const getRazorpayErrorMessage = (body) => {
    return body?.error?.description ||
        body?.error?.reason ||
        body?.message ||
        'Failed to create Razorpay order';
};

router.get('/plans', async(req, res) => {
    try {
        const plans = await resolveAllPlanPricing();
        res.json({
            pricingVersion: PRICING_VERSION,
            plans,
            warnings: plans.map((plan) => plan.warning).filter(Boolean)
        });
    } catch (err) {
        console.error('Plan pricing error:', err.message);
        res.status(500).json({ message: 'Unable to load plan pricing' });
    }
});

router.get('/subscription/status', protect, async(req, res) => {
    try {
        const subscription = await BillingSubscription.findOne({
            user: req.user._id
        }).sort({ createdAt: -1 }).lean();

        res.json({
            user: serializeUser(req.user),
            subscription
        });
    } catch (err) {
        res.status(500).json({ message: 'Unable to load subscription status' });
    }
});

router.post('/trial/start', protect, async(req, res) => {
    try {
        if (req.user.trialUsedAt) {
            return res.status(400).json({ message: 'Your 7-day trial has already been used on this account.' });
        }

        const alreadyActive = req.user.plan && req.user.plan !== 'free' && (!req.user.planExpiresAt || req.user.planExpiresAt > new Date());
        if (alreadyActive) {
            return res.json({
                message: 'Your account already has active Pro access.',
                user: serializeUser(req.user)
            });
        }

        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + 7);

        req.user.plan = 'trial';
        req.user.planExpiresAt = expiresAt;
        req.user.subscriptionProvider = 'manual';
        req.user.subscriptionStatus = 'trial';
        req.user.planStartedAt = now;
        req.user.trialStartedAt = now;
        req.user.trialUsedAt = now;
        await req.user.save();

        res.json({
            message: '7-day Pro trial activated',
            user: serializeUser(req.user)
        });
    } catch (err) {
        console.error('Trial activation error:', err.message);
        res.status(500).json({ message: 'Unable to activate trial' });
    }
});

router.post('/razorpay/subscription', protect, async(req, res) => {
    try {
        const { plan } = req.body;
        const normalizedPlan = normalizePlan(plan);
        if (!normalizedPlan) return res.status(400).json({ message: 'Invalid plan' });
        if (planDetails[normalizedPlan].checkoutType === 'one_time') {
            return res.status(400).json({ message: 'This plan uses one-time checkout, not subscription checkout.' });
        }

        let selectedPlan;
        try {
            selectedPlan = await resolvePlanPricing(normalizedPlan, {
                requireLive: process.env.PAYMENT_SIMULATION !== 'true'
            });
        } catch (pricingErr) {
            return res.status(500).json({
                message: `Unable to verify Razorpay ${normalizedPlan} plan amount. Check the plan ID, key mode, and Razorpay amount. ${pricingErr.message}`
            });
        }

        const providerPlanId = getRazorpaySubscriptionPlanId(normalizedPlan);
        const authHeader = getRazorpayAuthHeader();

        if (process.env.PAYMENT_SIMULATION === 'true') {
            const subscriptionId = `sub_sim_${Date.now()}`;
            const expiresAt = getFallbackExpiry(normalizedPlan);
            const record = await BillingSubscription.create({
                user: req.user._id,
                plan: normalizedPlan,
                providerSubscriptionId: subscriptionId,
                providerPlanId: 'simulation',
                amount: selectedPlan.amount,
                currency: 'INR',
                status: 'active',
                currentStart: new Date(),
                currentEnd: expiresAt,
                totalCount: 1,
                paidCount: 1,
                remainingCount: 0,
                lastPaymentId: `pay_sim_${Date.now()}`,
                latestEvent: 'simulation.subscription.active',
                raw: { simulation: true }
            });

            const user = await User.findById(req.user._id);
            await setUserPlan(user, normalizedPlan, {
                expiresAt,
                subscriptionId,
                subscriptionProvider: 'razorpay',
                subscriptionStatus: 'active',
                lastPaymentAt: new Date()
            });

            return res.json({
                simulation: true,
                keyId: 'rzp_test_simulation',
                subscription: {
                    id: record.providerSubscriptionId,
                    status: record.status
                },
                plan: selectedPlan,
                user: serializeUser(user)
            });
        }

        if (!authHeader) return res.status(500).json({ message: 'Razorpay keys not configured' });
        if (!providerPlanId) {
            return res.status(500).json({
                message: `${planDetails[normalizedPlan].planEnv} is not configured. Create Razorpay Subscription plans and add their IDs to the backend environment.`
            });
        }

        const razorpayRes = await requestRazorpay({
            path: '/v1/subscriptions',
            authHeader,
            payload: {
                plan_id: providerPlanId,
            total_count: planDetails[normalizedPlan].subscriptionCycles,
                quantity: 1,
                customer_notify: true,
                notes: {
                    userId: String(req.user._id),
                    plan: normalizedPlan
                }
            }
        });

        if (!razorpayRes.ok) {
            return res.status(razorpayRes.status).json({
                message: getRazorpayErrorMessage(razorpayRes.body)
            });
        }

        await BillingSubscription.findOneAndUpdate({
            providerSubscriptionId: razorpayRes.body.id
        }, {
            user: req.user._id,
            plan: normalizedPlan,
            provider: 'razorpay',
            providerSubscriptionId: razorpayRes.body.id,
            amount: selectedPlan.amount,
            currency: 'INR',
            latestEvent: 'subscription.created',
            ...mapSubscriptionEntity(razorpayRes.body)
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        });

        res.json({
            keyId: process.env.RAZORPAY_KEY_ID,
            subscription: razorpayRes.body,
            plan: selectedPlan,
            checkoutType: 'subscription',
            pricingVersion: PRICING_VERSION
        });
    } catch (err) {
        console.error('Razorpay subscription create error:', err.message);
        res.status(500).json({ message: 'Unable to create Razorpay subscription' });
    }
});

router.post('/razorpay/subscription/verify', protect, async(req, res) => {
    try {
        const {
            plan,
            razorpay_subscription_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const normalizedPlan = normalizePlan(plan);
        if (!normalizedPlan) return res.status(400).json({ message: 'Invalid plan' });
        if (!razorpay_subscription_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing Razorpay subscription verification fields' });
        }

        const subscription = await BillingSubscription.findOne({
            user: req.user._id,
            providerSubscriptionId: razorpay_subscription_id
        });

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription record not found' });
        }

        if (subscription.plan !== normalizedPlan) {
            return res.status(400).json({ message: 'Subscription plan mismatch' });
        }

        if (process.env.PAYMENT_SIMULATION !== 'true') {
            if (!process.env.RAZORPAY_KEY_SECRET) {
                return res.status(500).json({ message: 'Razorpay keys missing' });
            }

            const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            shasum.update(`${razorpay_payment_id}|${subscription.providerSubscriptionId}`);
            if (shasum.digest('hex') !== razorpay_signature) {
                return res.status(400).json({ message: 'Subscription verification failed' });
            }
        }

        subscription.status = 'authenticated';
        subscription.lastPaymentId = razorpay_payment_id;
        subscription.latestEvent = 'checkout.subscription.authorized';
        if (!subscription.currentStart) subscription.currentStart = new Date();
        if (!subscription.currentEnd) subscription.currentEnd = getFallbackExpiry(normalizedPlan);
        await subscription.save();

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        await setUserPlan(user, normalizedPlan, {
            expiresAt: subscription.currentEnd || getFallbackExpiry(normalizedPlan),
            subscriptionId: subscription.providerSubscriptionId,
            subscriptionProvider: 'razorpay',
            subscriptionStatus: subscription.status,
            lastPaymentAt: new Date()
        });

        res.json({
            message: 'Subscription verified',
            user: serializeUser(user),
            subscription,
            plan: normalizedPlan
        });
    } catch (err) {
        console.error('Razorpay subscription verify error:', err.message);
        res.status(500).json({ message: 'Subscription verification failed' });
    }
});

router.post('/razorpay/subscription/cancel', protect, async(req, res) => {
    try {
        const cancelAtCycleEnd = req.body?.cancelAtCycleEnd !== false;
        const subscription = await BillingSubscription.findOne({
            user: req.user._id,
            providerSubscriptionId: req.user.razorpaySubscriptionId
        });

        if (!subscription) return res.status(404).json({ message: 'Active subscription not found' });

        if (process.env.PAYMENT_SIMULATION === 'true') {
            subscription.status = cancelAtCycleEnd ? 'cancel_scheduled' : 'cancelled';
            subscription.latestEvent = 'simulation.subscription.cancelled';
            if (!cancelAtCycleEnd) subscription.endedAt = new Date();
            await subscription.save();

            const user = await User.findById(req.user._id);
            if (cancelAtCycleEnd) {
                user.subscriptionStatus = 'cancel_scheduled';
                await user.save();
            } else {
                await setUserFree(user, 'cancelled');
            }

            return res.json({ message: 'Subscription cancelled', user: serializeUser(user), subscription });
        }

        const authHeader = getRazorpayAuthHeader();
        if (!authHeader) return res.status(500).json({ message: 'Razorpay keys not configured' });

        const razorpayRes = await requestRazorpay({
            path: `/v1/subscriptions/${subscription.providerSubscriptionId}/cancel`,
            authHeader,
            payload: {
                cancel_at_cycle_end: Boolean(cancelAtCycleEnd)
            }
        });

        if (!razorpayRes.ok) {
            return res.status(razorpayRes.status).json({
                message: getRazorpayErrorMessage(razorpayRes.body)
            });
        }

        Object.assign(subscription, mapSubscriptionEntity(razorpayRes.body), {
            latestEvent: 'subscription.cancel_requested'
        });
        await subscription.save();

        const user = await User.findById(req.user._id);
        if (cancelAtCycleEnd && subscription.currentEnd && subscription.currentEnd > new Date()) {
            user.subscriptionStatus = 'cancel_scheduled';
            await user.save();
        } else {
            await setUserFree(user, 'cancelled');
        }

        res.json({ message: 'Subscription cancelled', user: serializeUser(user), subscription });
    } catch (err) {
        console.error('Razorpay subscription cancel error:', err.message);
        res.status(500).json({ message: 'Unable to cancel subscription' });
    }
});

router.post('/razorpay/order', protect, async(req, res) => {
    try {
        const { plan } = req.body;
        const normalizedPlan = normalizePlan(plan);
        if (!normalizedPlan) return res.status(400).json({ message: 'Invalid plan' });
        let selectedPlan;
        try {
            selectedPlan = await resolvePlanPricing(normalizedPlan, {
                requireLive: process.env.PAYMENT_SIMULATION !== 'true'
            });
        } catch (pricingErr) {
            return res.status(500).json({
                message: `Unable to verify Razorpay ${normalizedPlan} plan amount. Check the plan ID, key mode, and Razorpay amount. ${pricingErr.message}`
            });
        }

        const authHeader = getRazorpayAuthHeader();
        if (process.env.PAYMENT_SIMULATION === 'true') {
            return res.json({
                simulation: true,
                keyId: 'rzp_test_simulation',
                order: { id: 'order_sim_' + Date.now(), amount: selectedPlan.amount * 100, currency: 'INR' },
                plan: selectedPlan
            });
        }

        if (!authHeader) return res.status(500).json({ message: 'Razorpay keys not configured' });

        const razorpayRes = await createRazorpayOrder({
            amount: selectedPlan.amount * 100,
            currency: 'INR',
            receipt: `plan_${normalizedPlan}_${Date.now()}`,
            notes: { userId: String(req.user._id), plan: normalizedPlan }
        }, authHeader);

        if (!razorpayRes.ok) {
            return res.status(razorpayRes.status).json({
                message: getRazorpayErrorMessage(razorpayRes.body)
            });
        }

        res.json({
            keyId: process.env.RAZORPAY_KEY_ID,
            order: razorpayRes.body,
            plan: selectedPlan,
            pricingVersion: PRICING_VERSION
        });
    } catch (err) {
        console.error('Razorpay plan order error:', err.message);
        res.status(500).json({ message: 'Unable to create Razorpay order' });
    }
});

router.post('/invoices/:id/payment-link', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'invoice');

        const invoice = await Invoice.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        if (invoice.documentType === 'proposal') return res.status(400).json({ message: 'Proposals cannot be paid' });
        if (invoice.status === 'paid') return res.status(400).json({ message: 'This invoice is already paid' });

        const amount = Number(invoice.amount || 0);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Invoice amount must be greater than zero' });
        }

        if (isReusablePaymentLink(invoice.paymentLink)) {
            return res.json({
                message: 'Payment link already exists',
                paymentLink: invoice.paymentLink,
                invoice
            });
        }

        const publicUrl = getPublicInvoiceUrl(process.env.FRONTEND_URL, invoice._id);

        if (process.env.PAYMENT_SIMULATION === 'true') {
            invoice.paymentLink = {
                provider: 'razorpay',
                providerPaymentLinkId: `plink_sim_${Date.now()}`,
                shortUrl: publicUrl,
                status: 'created',
                amount,
                currency: invoice.currency || 'INR',
                createdAt: new Date(),
                paidAt: null,
                paymentId: '',
                raw: { simulation: true }
            };
            appendInvoicePaymentEvent(invoice, {
                type: 'payment_link.created',
                providerPaymentLinkId: invoice.paymentLink.providerPaymentLinkId,
                status: 'created',
                amount,
                currency: invoice.currency || 'INR',
                message: 'Simulation Razorpay payment link created.'
            });
            await invoice.save();

            return res.json({
                simulation: true,
                message: 'Simulation payment link created',
                paymentLink: invoice.paymentLink,
                invoice
            });
        }

        const authHeader = getRazorpayAuthHeader();
        if (!authHeader) return res.status(500).json({ message: 'Razorpay keys missing' });

        const referenceId = `inv_${invoice._id}_${Date.now().toString(36)}`.slice(0, 40);
        const razorpayRes = await requestRazorpay({
            path: '/v1/payment_links',
            authHeader,
            payload: {
                amount: Math.round(amount * 100),
                currency: invoice.currency || 'INR',
                accept_partial: false,
                description: `Invoice ${invoice.invoiceNumber}`,
                reference_id: referenceId,
                customer: {
                    name: invoice.clientName || 'Client',
                    email: invoice.clientEmail || undefined
                },
                notify: {
                    sms: false,
                    email: false
                },
                reminder_enable: true,
                callback_url: publicUrl || undefined,
                callback_method: publicUrl ? 'get' : undefined,
                notes: {
                    invoiceId: String(invoice._id),
                    userId: String(invoice.user),
                    invoiceNumber: invoice.invoiceNumber
                }
            }
        });

        if (!razorpayRes.ok) {
            return res.status(razorpayRes.status).json({
                message: getRazorpayErrorMessage(razorpayRes.body)
            });
        }

        invoice.paymentLink = mapPaymentLinkEntity(razorpayRes.body);
        appendInvoicePaymentEvent(invoice, {
            type: 'payment_link.created',
            providerPaymentLinkId: invoice.paymentLink.providerPaymentLinkId,
            status: invoice.paymentLink.status || 'created',
            amount: invoice.paymentLink.amount || amount,
            currency: invoice.paymentLink.currency || invoice.currency || 'INR',
            message: 'Razorpay payment link created for this invoice.'
        });
        await invoice.save();

        res.json({
            message: 'Payment link created',
            paymentLink: invoice.paymentLink,
            invoice
        });
    } catch (err) {
        console.error('Razorpay invoice payment link error:', err.message);
        res.status(500).json({ message: 'Unable to create payment link' });
    }
});

router.post('/public/order', async(req, res) => {
    try {
        const { invoiceId } = req.body;
        if (!isValidObjectId(invoiceId)) return rejectInvalidObjectId(res, 'invoice');
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        if (invoice.documentType === 'proposal') return res.status(400).json({ message: 'Proposals cannot be paid' });
        if (invoice.status === 'paid') return res.status(400).json({ message: 'Paid already' });

        const authHeader = getRazorpayAuthHeader();
        if (process.env.PAYMENT_SIMULATION === 'true') {
            return res.json({
                simulation: true, keyId: 'rzp_test_simulation',
                order: { id: 'order_sim_' + Date.now(), amount: invoice.amount * 100, currency: 'INR' }
            });
        }

        if (!authHeader) return res.status(500).json({ message: 'Razorpay keys missing' });

        const razorpayRes = await createRazorpayOrder({
            amount: Math.round(invoice.amount * 100),
            currency: 'INR',
            receipt: `inv_${invoice._id}`,
            notes: { invoiceId: String(invoice._id) }
        }, authHeader);

        if (!razorpayRes.ok) {
            return res.status(razorpayRes.status).json({
                message: getRazorpayErrorMessage(razorpayRes.body)
            });
        }
        res.json({ keyId: process.env.RAZORPAY_KEY_ID, order: razorpayRes.body });
    } catch (err) {
        console.error('Razorpay public order error:', err.message);
        res.status(500).json({ message: 'Unable to create Razorpay order' });
    }
});

router.post('/public/verify', async(req, res) => {
    try {
        const { invoiceId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!isValidObjectId(invoiceId)) return rejectInvalidObjectId(res, 'invoice');
        const invoice = await Invoice.findById(invoiceId).populate('user', 'companyName name email');
        if (!invoice) return res.status(404).json({ message: 'Not found' });
        if (invoice.documentType === 'proposal') return res.status(400).json({ message: 'Proposals cannot be paid' });

        if (invoice.status === 'paid') {
            return res.json({ message: 'Already paid', status: 'paid' });
        }

        if (process.env.PAYMENT_SIMULATION !== 'true') {
            if (!process.env.RAZORPAY_KEY_SECRET) {
                return res.status(500).json({ message: 'Razorpay keys missing' });
            }

            const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
            if (shasum.digest('hex') !== razorpay_signature) return res.status(400).json({ message: 'Verification failed' });
        }

        await markInvoicePaidFromPayment(invoice, {
            paymentId: razorpay_payment_id
        });
        res.json({ message: 'Success', status: 'paid' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/razorpay/verify', protect, async(req, res) => {
    try {
        const { plan, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const normalizedPlan = normalizePlan(plan);
        if (!normalizedPlan) return res.status(400).json({ message: 'Invalid plan' });

        if (process.env.PAYMENT_SIMULATION !== 'true') {
            if (!process.env.RAZORPAY_KEY_SECRET) {
                return res.status(500).json({ message: 'Razorpay keys missing' });
            }

            const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
            if (shasum.digest('hex') !== razorpay_signature) return res.status(400).json({ message: 'Verification failed' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        await setUserPlan(user, normalizedPlan, {
            subscriptionProvider: 'razorpay',
            subscriptionStatus: 'one_time_payment',
            lastPaymentAt: new Date()
        });
        res.json({ message: 'Success', user: serializeUser(user), plan: normalizedPlan });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/request', protect, upload.single('screenshot'), async(req, res) => {
    try {
        const { plan } = req.body;
        const normalizedPlan = normalizePlan(plan);
        if (!req.file) return res.status(400).json({ message: 'File required' });
        if (!normalizedPlan) return res.status(400).json({ message: 'Invalid plan' });

        await PaymentRequest.create({
            user: req.user._id,
            screenshot: req.file.originalname,
            screenshotName: req.file.originalname,
            screenshotContentType: req.file.mimetype,
            screenshotSize: req.file.size,
            screenshotData: req.file.buffer,
            plan: normalizedPlan,
            status: 'pending'
        });

        res.json({ message: 'Submitted' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/requests', protect, async(req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
        const requests = await PaymentRequest.find()
            .select('-screenshotData')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        res.json(requests.map((request) => ({
            ...request.toObject(),
            screenshotUrl: `/api/payment/requests/${request._id}/screenshot`
        })));
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/admin/revenue', protect, async(req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

        const activeSubscriptionStatuses = ['active', 'authenticated'];
        const [userStats, invoiceStatsResult, activeSubscriptions, recentSubscriptions, recentPaidInvoices] = await Promise.all([
            User.aggregate([
                {
                    $group: {
                        _id: null,
                        totalUsers: { $sum: 1 },
                        proUsers: {
                            $sum: {
                                $cond: [{ $in: ['$plan', ['monthly', 'yearly', 'founder90', 'trial', 'pro']] }, 1, 0]
                            }
                        },
                        trialUsers: {
                            $sum: {
                                $cond: [{ $eq: ['$plan', 'trial'] }, 1, 0]
                            }
                        }
                    }
                }
            ]),
            Invoice.aggregate([
                { $match: { documentType: { $ne: 'proposal' } } },
                {
                    $group: {
                        _id: null,
                        totalInvoiceValue: { $sum: '$amount' },
                        paidRevenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
                        pendingRevenue: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
                        totalInvoices: { $sum: 1 },
                        paidInvoices: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
                        paymentLinks: {
                            $sum: {
                                $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$paymentLink.shortUrl', ''] } }, 0] }, 1, 0]
                            }
                        }
                    }
                }
            ]),
            BillingSubscription.find({
                status: { $in: activeSubscriptionStatuses }
            }).select('plan amount currency status currentEnd providerSubscriptionId updatedAt').lean(),
            BillingSubscription.find()
                .select('plan amount currency status currentEnd providerSubscriptionId latestEvent lastPaymentId updatedAt createdAt')
                .sort({ updatedAt: -1 })
                .limit(8)
                .lean(),
            Invoice.find({ documentType: { $ne: 'proposal' }, status: 'paid' })
                .select('clientName clientEmail invoiceNumber amount currency paidAt paymentLink paymentEvents')
                .sort({ paidAt: -1, updatedAt: -1 })
                .limit(8)
                .lean()
        ]);

        const userSummary = userStats[0] || { totalUsers: 0, proUsers: 0, trialUsers: 0 };
        const invoiceSummary = invoiceStatsResult[0] || {
            totalInvoiceValue: 0,
            paidRevenue: 0,
            pendingRevenue: 0,
            totalInvoices: 0,
            paidInvoices: 0,
            paymentLinks: 0
        };
        const mrr = activeSubscriptions.reduce((sum, subscription) => {
            if (subscription.plan === 'yearly') return sum + Number(subscription.amount || 0) / 12;
            if (subscription.plan === 'founder90') return sum;
            return sum + Number(subscription.amount || 0);
        }, 0);

        res.json({
            users: userSummary,
            invoices: invoiceSummary,
            subscriptions: {
                active: activeSubscriptions.length,
                mrr: Math.round(mrr),
                recent: recentSubscriptions
            },
            recentPaidInvoices
        });
    } catch (err) {
        console.error('ADMIN REVENUE ERROR:', err.message);
        res.status(500).json({ message: 'Unable to load revenue dashboard' });
    }
});

router.get('/requests/:id/screenshot', protect, async(req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
        if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'payment request');

        const request = await PaymentRequest.findById(req.params.id).select('+screenshotData');
        if (!request) return res.status(404).json({ message: 'Not found' });
        if (!request.screenshotData) return res.status(410).json({ message: 'Screenshot is not available' });

        res.set('Content-Type', request.screenshotContentType || 'application/octet-stream');
        res.set('Content-Length', String(request.screenshotData.length));
        res.send(request.screenshotData);
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/approve/:id', protect, async(req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
        if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'payment request');
        const request = await PaymentRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Not found' });
        request.status = 'approved';
        await request.save();
        const user = await User.findById(request.user);
        if (user) await setUserPlan(user, request.plan, {
            subscriptionStatus: 'manual_approval',
            lastPaymentAt: new Date()
        });
        res.json({ message: 'Approved' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

const syncSubscriptionFromWebhook = async(event, subscriptionEntity, paymentEntity = null) => {
    if (!subscriptionEntity?.id) return;

    const notes = subscriptionEntity.notes || {};
    let subscription = await BillingSubscription.findOne({
        providerSubscriptionId: subscriptionEntity.id
    });

    const normalizedPlan = normalizePlan(subscription?.plan || notes.plan);
    const userId = subscription?.user || notes.userId;

    if (!normalizedPlan || !userId || !isValidObjectId(userId)) return;

    if (!subscription) {
        subscription = new BillingSubscription({
            user: userId,
            plan: normalizedPlan,
            provider: 'razorpay',
            providerSubscriptionId: subscriptionEntity.id,
            amount: planDetails[normalizedPlan].amount,
            currency: 'INR'
        });
    }

    Object.assign(subscription, mapSubscriptionEntity(subscriptionEntity), {
        latestEvent: event,
        lastPaymentId: paymentEntity?.id || subscription.lastPaymentId
    });

    await subscription.save();

    const user = await User.findById(userId);
    if (!user) return;

    const status = subscriptionEntity.status || subscription.status;
    const shouldActivate = [
        'subscription.authenticated',
        'subscription.activated',
        'subscription.charged'
    ].includes(event) || ['authenticated', 'active'].includes(status);

    const shouldDeactivate = [
        'subscription.cancelled',
        'subscription.completed',
        'subscription.expired',
        'subscription.halted',
        'subscription.paused'
    ].includes(event) || ['cancelled', 'completed', 'expired', 'halted', 'paused'].includes(status);

    if (shouldActivate) {
        await setUserPlan(user, normalizedPlan, {
            expiresAt: subscription.currentEnd || getFallbackExpiry(normalizedPlan),
            subscriptionId: subscription.providerSubscriptionId,
            subscriptionProvider: 'razorpay',
            subscriptionStatus: status || 'active',
            lastPaymentAt: paymentEntity ? new Date() : user.lastPaymentAt
        });
        return;
    }

    if (shouldDeactivate) {
        await setUserFree(user, status || 'cancelled');
    }
};

router.post('/webhook', async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers['x-razorpay-signature'];

        if (secret) {
            if (!signature) return res.status(400).json({ message: 'Missing signature' });
            const shasum = crypto.createHmac('sha256', secret);
            shasum.update(req.rawBody || JSON.stringify(req.body));
            if (shasum.digest('hex') !== signature) return res.status(400).json({ message: 'Invalid signature' });
        }

        const { event, payload } = req.body;
        if (event && String(event).startsWith('subscription.')) {
            await syncSubscriptionFromWebhook(
                event,
                payload?.subscription?.entity,
                payload?.payment?.entity
            );
        }

        if (event === 'payment_link.paid') {
            const paymentLinkEntity = payload?.payment_link?.entity;
            const paymentEntity = payload?.payment?.entity;
            const notes = {
                ...normalizeNotes(paymentLinkEntity?.notes),
                ...normalizeNotes(paymentEntity?.notes)
            };

            let inv = null;
            if (notes.invoiceId && isValidObjectId(notes.invoiceId)) {
                inv = await Invoice.findById(notes.invoiceId).populate('user', 'companyName name email');
            } else if (paymentLinkEntity?.id) {
                inv = await Invoice.findOne({
                    'paymentLink.providerPaymentLinkId': paymentLinkEntity.id
                }).populate('user', 'companyName name email');
            }

            if (inv && inv.documentType !== 'proposal') {
                await markInvoicePaidFromPayment(inv, {
                    paymentLinkEntity,
                    paymentEntity
                });
            }
        }

        if (event === 'payment.captured' || event === 'order.paid') {
            const paymentEntity = payload?.payment?.entity;
            const orderEntity = payload?.order?.entity;
            const notes = {
                ...normalizeNotes(orderEntity?.notes),
                ...normalizeNotes(paymentEntity?.notes)
            };
            if (notes?.invoiceId && isValidObjectId(notes.invoiceId)) {
                const inv = await Invoice.findById(notes.invoiceId).populate('user', 'companyName name email');
                if (inv && inv.documentType !== 'proposal') {
                    await markInvoicePaidFromPayment(inv, {
                        paymentId: paymentEntity?.id
                    });
                }
            }
            if (notes?.plan && notes?.userId && isValidObjectId(notes.userId)) {
                const normalizedPlan = normalizePlan(notes.plan);
                if (normalizedPlan) {
                    const u = await User.findById(notes.userId);
                    if (u) await setUserPlan(u, normalizedPlan, {
                        subscriptionStatus: planDetails[normalizedPlan].checkoutType === 'one_time' ? 'one_time_payment' : 'webhook_payment',
                        lastPaymentAt: new Date()
                    });
                }
            }
        }
        res.json({ status: 'ok' });
    } catch (err) { res.status(500).json({ message: 'Webhook failed' }); }
});

module.exports = router;
