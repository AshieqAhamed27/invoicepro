const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const https = require('https');

const { protect } = require('../middleware/auth');
const User = require('../models/User');
const PaymentRequest = require('../models/PaymentRequest');
const Invoice = require('../models/Invoice');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'upload/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

const planDetails = {
    monthly: {
        amount: 99,
        label: 'Monthly Plan',
        durationDays: 30
    },
    yearly: {
        amount: 999,
        label: 'Yearly Plan',
        durationDays: 365
    }
};

const getRazorpayAuthHeader = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
};

const setUserPlan = async(user, plan) => {
    const selectedPlan = planDetails[plan];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (selectedPlan?.durationDays || 30));

    user.plan = plan;
    user.planExpiresAt = expiresAt;
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
                        body: JSON.parse(body)
                    });
                } catch (err) { reject(err); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
};

router.post('/razorpay/order', protect, async(req, res) => {
    try {
        const { plan } = req.body;
        const selectedPlan = planDetails[plan];
        if (!selectedPlan) return res.status(400).json({ message: 'Invalid plan' });

        const authHeader = getRazorpayAuthHeader();
        if (process.env.PAYMENT_SIMULATION === 'true') {
            return res.json({
                simulation: true,
                keyId: 'rzp_test_simulation',
                order: { id: 'order_sim_' + Date.now(), amount: selectedPlan.amount * 100, currency: 'INR' },
                plan: { id: plan, label: selectedPlan.label, amount: selectedPlan.amount }
            });
        }

        if (!authHeader) return res.status(500).json({ message: 'Razorpay keys not configured' });

        const razorpayRes = await createRazorpayOrder({
            amount: selectedPlan.amount * 100,
            currency: 'INR',
            receipt: `plan_${plan}_${Date.now()}`,
            notes: { userId: String(req.user._id), plan }
        }, authHeader);

        if (!razorpayRes.ok) return res.status(razorpayRes.status).json({ message: 'Failed to create order' });

        res.json({ keyId: process.env.RAZORPAY_KEY_ID, order: razorpayRes.body, plan: { id: plan, label: selectedPlan.label, amount: selectedPlan.amount } });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/public/order', async(req, res) => {
    try {
        const { invoiceId } = req.body;
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
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

        if (!razorpayRes.ok) return res.status(razorpayRes.status).json({ message: 'Failed to create order' });
        res.json({ keyId: process.env.RAZORPAY_KEY_ID, order: razorpayRes.body });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/public/verify', async(req, res) => {
    try {
        const { invoiceId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) return res.status(404).json({ message: 'Not found' });

        if (process.env.PAYMENT_SIMULATION !== 'true') {
            const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
            if (shasum.digest('hex') !== razorpay_signature) return res.status(400).json({ message: 'Verification failed' });
        }

        invoice.status = 'paid';
        invoice.paidAt = new Date();
        await invoice.save();
        res.json({ message: 'Success', status: 'paid' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/razorpay/verify', protect, async(req, res) => {
    try {
        const { plan, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (process.env.PAYMENT_SIMULATION !== 'true') {
            const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
            if (shasum.digest('hex') !== razorpay_signature) return res.status(400).json({ message: 'Verification failed' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        await setUserPlan(user, plan);
        res.json({ message: 'Success', user });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/request', protect, upload.single('screenshot'), async(req, res) => {
    try {
        const { plan } = req.body;
        if (!req.file) return res.status(400).json({ message: 'File required' });
        await PaymentRequest.create({ user: req.user._id, screenshot: req.file.filename, plan, status: 'pending' });
        res.json({ message: 'Submitted' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/requests', protect, async(req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
        const requests = await PaymentRequest.find().populate('user', 'name email');
        res.json(requests);
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/approve/:id', protect, async(req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
        const request = await PaymentRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Not found' });
        request.status = 'approved';
        await request.save();
        const user = await User.findById(request.user);
        if (user) await setUserPlan(user, request.plan);
        res.json({ message: 'Approved' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/webhook', async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers['x-razorpay-signature'];

        if (secret && signature) {
            const shasum = crypto.createHmac('sha256', secret);
            shasum.update(JSON.stringify(req.body));
            if (shasum.digest('hex') !== signature) return res.status(400).json({ message: 'Invalid signature' });
        }

        const { event, payload } = req.body;
        if (event === 'payment.captured' || event === 'order.paid') {
            const notes = (payload.payment?.entity?.notes) || (payload.order?.entity?.notes);
            if (notes?.invoiceId) {
                const inv = await Invoice.findById(notes.invoiceId);
                if (inv && inv.status !== 'paid') {
                    inv.status = 'paid';
                    inv.paidAt = new Date();
                    await inv.save();
                }
            }
            if (notes?.plan && notes?.userId) {
                const u = await User.findById(notes.userId);
                if (u) await setUserPlan(u, notes.plan);
            }
        }
        res.json({ status: 'ok' });
    } catch (err) { res.status(500).json({ message: 'Webhook failed' }); }
});

module.exports = router;
