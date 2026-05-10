const express = require('express');
const crypto = require('crypto');
const https = require('https');

const AgencySetup = require('../models/AgencySetup');
const { protect } = require('../middleware/auth');
const { isValidObjectId, rejectInvalidObjectId } = require('../utils/objectId');

const router = express.Router();

const setupPackages = {
    starter: {
        id: 'starter',
        name: 'Starter Setup',
        amount: Number(process.env.AGENCY_STARTER_AMOUNT || 999),
        currency: 'INR',
        delivery: '2-3 working days'
    },
    growth: {
        id: 'growth',
        name: 'Growth Setup',
        amount: Number(process.env.AGENCY_GROWTH_AMOUNT || 2999),
        currency: 'INR',
        delivery: '3-5 working days'
    },
    managed: {
        id: 'managed',
        name: 'Managed Growth',
        amount: Number(process.env.AGENCY_MANAGED_AMOUNT || 4999),
        currency: 'INR',
        delivery: 'First month support'
    }
};

const defaultChecklist = [
    { key: 'intake', label: 'Review skill, niche, goal, and current problem' },
    { key: 'offer', label: 'Create clear service offer and positioning' },
    { key: 'lead_plan', label: 'Create lead source and outreach plan' },
    { key: 'proposal', label: 'Prepare proposal template and follow-up messages' },
    { key: 'workspace', label: 'Set up ClientFlow AI project and delivery workflow' },
    { key: 'payment', label: 'Set up invoice, payment, and collection workflow' },
    { key: 'handover', label: 'Send handover notes and next 7-day action plan' }
];

const sanitizeText = (value, max = 500) => String(value || '').trim().slice(0, max);
const sanitizeEmail = (value) => sanitizeText(value, 160).toLowerCase();
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getPackage = (packageId) => setupPackages[String(packageId || '').toLowerCase()] || null;

const getRazorpayAuthHeader = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
};

const createRazorpayOrder = (payload, authHeader) => new Promise((resolve, reject) => {
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

const getRazorpayErrorMessage = (body) => (
    body?.error?.description ||
    body?.error?.reason ||
    body?.message ||
    'Failed to create Razorpay order'
);

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    next();
};

router.get('/packages', (req, res) => {
    res.json({
        packages: Object.values(setupPackages)
    });
});

router.post('/bookings', async(req, res) => {
    try {
        const selectedPackage = getPackage(req.body.packageId);
        if (!selectedPackage) {
            return res.status(400).json({ message: 'Choose a valid setup package.' });
        }

        const customerName = sanitizeText(req.body.customerName, 120);
        const email = sanitizeEmail(req.body.email);
        const whatsapp = sanitizeText(req.body.whatsapp, 40);
        const skill = sanitizeText(req.body.skill, 220);
        const problem = sanitizeText(req.body.problem, 700);

        if (!customerName || !email || !whatsapp || !skill || !problem) {
            return res.status(400).json({ message: 'Name, email, WhatsApp, skill, and problem are required.' });
        }

        if (!isEmail(email)) {
            return res.status(400).json({ message: 'Enter a valid email address.' });
        }

        const booking = await AgencySetup.create({
            packageId: selectedPackage.id,
            packageName: selectedPackage.name,
            amount: selectedPackage.amount,
            currency: selectedPackage.currency,
            customerName,
            email,
            whatsapp,
            skill,
            problem,
            targetClient: sanitizeText(req.body.targetClient, 220),
            incomeGoal: sanitizeText(req.body.incomeGoal, 120),
            portfolioUrl: sanitizeText(req.body.portfolioUrl, 260),
            preferredPlatform: sanitizeText(req.body.preferredPlatform, 120),
            source: sanitizeText(req.body.source, 80) || 'agency_page'
        });

        res.status(201).json({
            message: 'Agency setup booking created',
            booking,
            package: selectedPackage
        });
    } catch (err) {
        console.error('AGENCY BOOKING ERROR:', err.message);
        res.status(500).json({ message: 'Unable to create agency setup booking.' });
    }
});

router.post('/bookings/:id/order', async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'agency booking');

        const booking = await AgencySetup.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found.' });
        if (booking.status !== 'payment_pending') {
            return res.status(400).json({ message: 'This booking is not pending payment.' });
        }

        const amount = Number(booking.amount || 0);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Invalid package amount.' });
        }

        if (process.env.PAYMENT_SIMULATION === 'true') {
            booking.payment.providerOrderId = `order_sim_agency_${Date.now()}`;
            booking.payment.raw = { simulation: true };
            await booking.save();

            return res.json({
                simulation: true,
                keyId: 'rzp_test_simulation',
                order: {
                    id: booking.payment.providerOrderId,
                    amount: Math.round(amount * 100),
                    currency: booking.currency || 'INR'
                },
                booking
            });
        }

        const authHeader = getRazorpayAuthHeader();
        if (!authHeader) return res.status(500).json({ message: 'Razorpay keys are not configured.' });

        const razorpayRes = await createRazorpayOrder({
            amount: Math.round(amount * 100),
            currency: booking.currency || 'INR',
            receipt: `agency_${booking._id}`.slice(0, 40),
            notes: {
                agencySetupId: String(booking._id),
                packageId: booking.packageId,
                packageName: booking.packageName,
                email: booking.email
            }
        }, authHeader);

        if (!razorpayRes.ok) {
            return res.status(razorpayRes.status).json({
                message: getRazorpayErrorMessage(razorpayRes.body)
            });
        }

        booking.payment.providerOrderId = razorpayRes.body.id || '';
        booking.payment.raw = razorpayRes.body;
        await booking.save();

        res.json({
            keyId: process.env.RAZORPAY_KEY_ID,
            order: razorpayRes.body,
            booking
        });
    } catch (err) {
        console.error('AGENCY ORDER ERROR:', err.message);
        res.status(500).json({ message: 'Unable to create agency setup payment order.' });
    }
});

router.post('/bookings/:id/verify', async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'agency booking');

        const booking = await AgencySetup.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found.' });

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (!razorpay_order_id) {
            return res.status(400).json({ message: 'Missing payment order id.' });
        }

        if (process.env.PAYMENT_SIMULATION !== 'true') {
            if (!razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({ message: 'Missing Razorpay payment verification fields.' });
            }

            const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
            shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
            if (shasum.digest('hex') !== razorpay_signature) {
                return res.status(400).json({ message: 'Payment verification failed.' });
            }
        }

        booking.status = 'paid';
        booking.payment.providerOrderId = razorpay_order_id;
        booking.payment.providerPaymentId = razorpay_payment_id || `pay_sim_agency_${Date.now()}`;
        booking.payment.providerSignature = razorpay_signature || '';
        booking.payment.status = 'paid';
        booking.payment.paidAt = new Date();
        if (!booking.deliveryChecklist?.length) {
            booking.deliveryChecklist = defaultChecklist;
        }
        await booking.save();

        res.json({
            message: 'Agency setup payment confirmed',
            booking
        });
    } catch (err) {
        console.error('AGENCY VERIFY ERROR:', err.message);
        res.status(500).json({ message: 'Unable to verify agency setup payment.' });
    }
});

router.get('/admin/bookings', protect, requireAdmin, async(req, res) => {
    try {
        const bookings = await AgencySetup.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.json({ bookings });
    } catch (err) {
        console.error('AGENCY ADMIN LIST ERROR:', err.message);
        res.status(500).json({ message: 'Unable to load agency setup bookings.' });
    }
});

router.put('/admin/bookings/:id/status', protect, requireAdmin, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'agency booking');

        const allowedStatuses = ['payment_pending', 'paid', 'in_progress', 'delivered', 'cancelled', 'refunded'];
        const status = sanitizeText(req.body.status, 40);
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid booking status.' });
        }

        const booking = await AgencySetup.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!booking) return res.status(404).json({ message: 'Booking not found.' });
        res.json({ message: 'Status updated', booking });
    } catch (err) {
        console.error('AGENCY STATUS ERROR:', err.message);
        res.status(500).json({ message: 'Unable to update booking status.' });
    }
});

router.put('/admin/bookings/:id/checklist/:key', protect, requireAdmin, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'agency booking');

        const booking = await AgencySetup.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found.' });

        if (!booking.deliveryChecklist?.length) {
            booking.deliveryChecklist = defaultChecklist;
        }

        const item = booking.deliveryChecklist.find((entry) => entry.key === req.params.key);
        if (!item) return res.status(404).json({ message: 'Checklist item not found.' });

        item.done = Boolean(req.body.done);
        item.notes = sanitizeText(req.body.notes, 280);
        item.completedAt = item.done ? new Date() : null;

        if (booking.status === 'paid' && item.done) {
            booking.status = 'in_progress';
        }

        const allDone = booking.deliveryChecklist.every((entry) => entry.done);
        if (allDone) {
            booking.status = 'delivered';
        }

        await booking.save();
        res.json({ message: 'Checklist updated', booking });
    } catch (err) {
        console.error('AGENCY CHECKLIST ERROR:', err.message);
        res.status(500).json({ message: 'Unable to update checklist.' });
    }
});

module.exports = router;
