const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const https = require('https');

const { protect } = require('../middleware/auth');
const User = require('../models/User');
const PaymentRequest = require('../models/PaymentRequest');

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

    if (!keyId || !keySecret) {
        return null;
    }

    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
};

const setUserPlan = async(user, plan) => {
    const selectedPlan = planDetails[plan];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + selectedPlan.durationDays);

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

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        body: JSON.parse(body)
                    });
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
};

// ==========================
// CREATE RAZORPAY ORDER
// ==========================
router.post('/razorpay/order', protect, async(req, res) => {
    try {
        const { plan } = req.body;
        const selectedPlan = planDetails[plan];

        if (!selectedPlan) {
            return res.status(400).json({
                message: 'Invalid plan selected'
            });
        }

        const authHeader = getRazorpayAuthHeader();

        // 🔥 SIMULATION MODE
        if (process.env.PAYMENT_SIMULATION === 'true') {
            return res.json({
                simulation: true,
                keyId: 'rzp_test_simulation',
                order: {
                    id: 'order_sim_' + Date.now(),
                    amount: selectedPlan.amount * 100,
                    currency: 'INR'
                },
                plan: {
                    id: plan,
                    label: selectedPlan.label,
                    amount: selectedPlan.amount
                }
            });
        }

        if (!authHeader) {
            return res.status(500).json({
                message: 'Razorpay keys are not configured'
            });
        }

        const amountInPaise = selectedPlan.amount * 100;
        const receipt = `plan_${plan}_${Date.now()}`;

        const razorpayRes = await createRazorpayOrder({
            amount: amountInPaise,
            currency: 'INR',
            receipt,
            notes: {
                userId: String(req.user._id),
                plan
            }
        }, authHeader);

        if (!razorpayRes.ok) {
            return res.status(razorpayRes.status).json({
                message: razorpayRes.body.error?.description || 'Failed to create Razorpay order'
            });
        }

        res.json({
            keyId: process.env.RAZORPAY_KEY_ID,
            order: razorpayRes.body,
            plan: {
                id: plan,
                label: selectedPlan.label,
                amount: selectedPlan.amount
            }
        });

    } catch (err) {
        console.error('RAZORPAY ORDER ERROR:', err);

        res.status(500).json({
            message: 'Server error'
        });
    }
});

// ==========================
// VERIFY RAZORPAY PAYMENT
// ==========================
router.post('/razorpay/verify', protect, async(req, res) => {
    try {
        const {
            plan,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (!planDetails[plan]) {
            return res.status(400).json({
                message: 'Invalid plan selected'
            });
        }

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                message: 'Missing Razorpay payment details'
            });
        }

        if (!process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({
                message: 'Razorpay secret is not configured'
            });
        }

        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature && process.env.PAYMENT_SIMULATION !== 'true') {
            return res.status(400).json({
                message: 'Payment verification failed'
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        await setUserPlan(user, plan);

        res.json({
            message: 'Payment verified and plan activated',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                companyName: user.companyName,
                plan: user.plan,
                planExpiresAt: user.planExpiresAt
            }
        });

    } catch (err) {
        console.error('RAZORPAY VERIFY ERROR:', err);

        res.status(500).json({
            message: 'Server error'
        });
    }
});

// ==========================
// SEND PAYMENT REQUEST
// ==========================
router.post('/request', protect, upload.single('screenshot'), async(req, res) => {
    try {
        const { plan } = req.body;

        if (!req.file) {
            return res.status(400).json({
                message: 'Screenshot required'
            });
        }

        await PaymentRequest.create({
            user: req.user._id,
            screenshot: req.file.filename,
            plan, // Make sure your model has 'plan' if needed, otherwise this is fine
            status: 'pending'
        });

        res.json({
            message: 'Payment request submitted'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

// ==========================
// GET ALL REQUESTS (ADMIN)
// ==========================
router.get('/requests', protect, async(req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const requests = await PaymentRequest.find().populate('user', 'name email');
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==========================
// APPROVE PAYMENT
// ==========================
router.put('/approve/:id', protect, async(req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const request = await PaymentRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                message: 'Request not found'
            });
        }

        request.status = 'approved';
        await request.save();

        const user = await User.findById(request.user);

        if (user) {
            await setUserPlan(user, request.plan || 'monthly');
        }

        res.json({
            message: 'Payment approved and user upgraded',
            request
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

module.exports = router;
