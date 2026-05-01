const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { getJwtSecret } = require('../utils/env');
const {
    protect
} = require('../middleware/auth');

const router = express.Router();

const isLocalNetworkHostname = (hostname) => {
    const host = String(hostname || '').toLowerCase();
    if (!host) return false;

    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true;
    if (host.endsWith('.local')) return true;

    if (/^10\./.test(host)) return true;
    if (/^192\.168\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;

    return false;
};

const normalizeLogoUrl = (value) => {
    const input = String(value ?? '').trim();
    if (!input) return '';

    if (/^data:image\//i.test(input)) return input;

    if (/^\/(?!\/).+\.(svg|png|jpe?g|webp|gif)([?#].*)?$/i.test(input)) {
        return input;
    }

    let parsed;
    try {
        parsed = new URL(input);
    } catch {
        throw new Error('Logo must be a valid URL.');
    }

    const protocol = String(parsed.protocol || '').toLowerCase();
    const isProd = process.env.NODE_ENV === 'production';

    if (protocol !== 'https:' && (isProd || protocol !== 'http:')) {
        throw new Error('Logo URL must start with https://');
    }

    if (isProd && isLocalNetworkHostname(parsed.hostname)) {
        throw new Error('Logo URL must be publicly accessible (not localhost/private IP).');
    }

    return parsed.toString();
};

// ==========================
// TOKEN
// ==========================
const generateToken = (id) => {
    return jwt.sign({ id },
        getJwtSecret(), {
            expiresIn: '30d'
        }
    );
};

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
    companyName: user.companyName,
    gstNumber: user.gstNumber,
    upiId: user.upiId,
    address: user.address,
    logo: user.logo
});

// ==========================
// SIGNUP
// ==========================
router.post(
    '/signup',
    async(req, res) => {
        try {
            const {
                name,
                email,
                password,
                companyName
            } = req.body;

            if (!name ||
                !email ||
                !password
            ) {
                return res
                    .status(400)
                    .json({
                        message: 'Please provide name, email, and password.'
                    });
            }

            const existingUser =
                await User.findOne({
                    email
                });

            if (existingUser) {
                return res
                    .status(400)
                    .json({
                        message: 'Email already registered.'
                    });
            }

            const user =
                await User.create({
                    name,
                    email,
                    password,
                    companyName
                });

            res.status(201).json({
                message: 'Account created successfully!',
                token: generateToken(
                    user._id
                ),
                user: serializeUser(user)
            });

        } catch (err) {
            console.error(
                'SIGNUP ERROR:',
                err
            );

            res.status(500).json({
                message: 'Server error. Please try again.'
            });
        }
    }
);

// ==========================
// LOGIN
// ==========================
router.post(
    '/login',
    async(req, res) => {
        try {
            const {
                email,
                password
            } = req.body;

            if (!email ||
                !password
            ) {
                return res
                    .status(400)
                    .json({
                        message: 'Please provide email and password.'
                    });
            }

            const user =
                await User.findOne({
                    email
                });

            if (!user) {
                return res
                    .status(401)
                    .json({
                        message: 'User not found'
                    });
            }

            const isMatch =
                await user.comparePassword(
                    password
                );

            if (!isMatch) {
                return res
                    .status(401)
                    .json({
                        message: 'Invalid password'
                    });
            }

            res.json({
                message: 'Login successful!',
                token: generateToken(
                    user._id
                ),
                user: serializeUser(user)
            });

        } catch (err) {
            console.error(
                'LOGIN ERROR:',
                err
            );

            res.status(500).json({
                message: 'Server error. Please try again.'
            });
        }
    }
);

// ==========================
// GOOGLE LOGIN
// ==========================
router.post(
    '/google',
    async(req, res) => {
        try {
            const {
                name,
                email
            } = req.body;

            let user =
                await User.findOne({
                    email
                });

            if (!user) {
                user =
                    await User.create({
                        name,
                        email,
                        password: Math.random()
                            .toString(36)
                    });
            }

            res.json({
                token: generateToken(
                    user._id
                ),
                user: serializeUser(user)
            });

        } catch {
            res.status(500).json({
                message: 'Google login failed'
            });
        }
    }
);

// ==========================
// GET CURRENT USER
// ==========================
router.get(
    '/me',
    protect,
    (req, res) => {
        res.json({
            user: serializeUser(req.user)
        });
    }
);

// ==========================
// SEND TEST EMAIL
// ==========================
router.post(
    '/email-test',
    protect,
    async(req, res) => {
        try {
            await sendEmail(req.user.email, 'InvoicePro email test', {
                html: `
                    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
                        <h2>InvoicePro email is working</h2>
                        <p>This test confirms your backend email settings can send mail.</p>
                    </div>
                `,
                text: 'InvoicePro email is working. This test confirms your backend email settings can send mail.'
            });

            res.json({ message: `Test email sent to ${req.user.email}` });
        } catch (err) {
            console.error('EMAIL TEST ERROR:', err.message);
            res.status(err.status || 500).json({
                message: err.message || 'Email test failed'
            });
        }
    }
);

// ==========================
// UPDATE PROFILE / SETTINGS
// ==========================
router.put(
    '/profile',
    protect,
    async(req, res) => {
        try {
            const {
                companyName,
                gstNumber,
                upiId,
                address,
                logo
            } = req.body;

            req.user.companyName =
                companyName ||
                req.user.companyName;

            req.user.gstNumber =
                gstNumber ||
                req.user.gstNumber;

            req.user.upiId =
                upiId ||
                req.user.upiId;

            req.user.address =
                address ||
                req.user.address;

            if (logo !== undefined) {
                req.user.logo = normalizeLogoUrl(logo);
            }

            await req.user.save();

            res.json({
                message: 'Profile updated',
                user: serializeUser(req.user)
            });

        } catch (err) {
            console.error(
                'PROFILE UPDATE ERROR:',
                err
            );

            if (err?.message && String(err.message).toLowerCase().includes('logo')) {
                return res.status(400).json({ message: err.message });
            }

            res.status(500).json({ message: 'Server error.' });
        }
    }
);

// Insecure direct upgrade route removed. 
// Use /payment/razorpay or /payment/request for verified upgrades.

module.exports = router;
