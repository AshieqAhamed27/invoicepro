const express = require('express');
const jwt = require('jsonwebtoken');
const https = require('https');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { getJwtSecret } = require('../utils/env');
const {
    protect,
    syncAdminRole
} = require('../middleware/auth');

const router = express.Router();

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));

const authError = (message, status = 400) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const verifyGoogleCredential = (credential) => {
    return new Promise((resolve, reject) => {
        const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
        const token = String(credential || '').trim();

        if (!clientId) {
            return reject(authError('Google login is not configured on the backend.', 503));
        }

        if (!token) {
            return reject(authError('Missing Google credential.', 400));
        }

        const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`;
        const req = https.get(url, { timeout: 8000 }, (googleRes) => {
            let body = '';

            googleRes.on('data', (chunk) => {
                body += chunk;
            });

            googleRes.on('end', () => {
                let payload = {};
                try {
                    payload = body ? JSON.parse(body) : {};
                } catch {
                    return reject(new Error('Invalid Google verification response.'));
                }

                if (googleRes.statusCode < 200 || googleRes.statusCode >= 300) {
                    return reject(authError(payload.error_description || 'Google credential verification failed.', 401));
                }

                if (payload.aud !== clientId) {
                    return reject(authError('Google credential audience mismatch.', 401));
                }

                if (!payload.email || payload.email_verified !== 'true') {
                    return reject(authError('Google account email is not verified.', 401));
                }

                resolve({
                    name: payload.name || payload.email.split('@')[0],
                    email: normalizeEmail(payload.email)
                });
            });
        });

        req.on('timeout', () => {
            req.destroy(authError('Google verification timed out.', 504));
        });
        req.on('error', reject);
    });
};

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
    trialStartedAt: user.trialStartedAt,
    trialUsedAt: user.trialUsedAt,
    companyName: user.companyName,
    gstNumber: user.gstNumber,
    upiId: user.upiId,
    address: user.address,
    logo: user.logo,
    role: user.role
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
            const normalizedEmail = normalizeEmail(email);

            if (!name ||
                !normalizedEmail ||
                !password
            ) {
                return res
                    .status(400)
                    .json({
                        message: 'Please provide name, email, and password.'
                    });
            }

            if (!isValidEmail(normalizedEmail)) {
                return res.status(400).json({
                    message: 'Please provide a valid email address.'
                });
            }

            if (String(password).length < 8) {
                return res.status(400).json({
                    message: 'Password must be at least 8 characters.'
                });
            }

            const existingUser =
                await User.findOne({
                    email: normalizedEmail
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
                    email: normalizedEmail,
                    password,
                    companyName
                });

            await syncAdminRole(user);

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
            const normalizedEmail = normalizeEmail(email);

            if (!normalizedEmail ||
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
                    email: normalizedEmail
                });

            if (!user) {
                return res
                    .status(401)
                    .json({
                        message: 'Invalid email or password.'
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
                        message: 'Invalid email or password.'
                    });
            }

            await syncAdminRole(user);

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
            const { credential } = req.body;
            const verifiedProfile = await verifyGoogleCredential(credential);

            let user =
                await User.findOne({
                    email: verifiedProfile.email
                });

            if (!user) {
                user =
                    await User.create({
                        name: verifiedProfile.name,
                        email: verifiedProfile.email,
                        password: Math.random()
                            .toString(36)
                    });
            }

            await syncAdminRole(user);

            res.json({
                token: generateToken(
                    user._id
                ),
                user: serializeUser(user)
            });

        } catch (err) {
            console.error('GOOGLE LOGIN ERROR:', err.message);
            const status = err.status || 500;
            res.status(status).json({
                message: status >= 500
                    ? 'Google login is temporarily unavailable. Please use email login or try again later.'
                    : err.message
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
            await sendEmail(req.user.email, 'ClientFlow AI email test', {
                html: `
                    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
                        <h2>ClientFlow AI email is working</h2>
                        <p>This test confirms your backend email settings can send mail.</p>
                    </div>
                `,
                text: 'ClientFlow AI email is working. This test confirms your backend email settings can send mail.'
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
