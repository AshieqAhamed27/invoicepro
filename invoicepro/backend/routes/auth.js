const express = require('express');
const jwt = require('jsonwebtoken');
const https = require('https');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { getJwtSecret, normalizeUrl } = require('../utils/env');
const {
    protect,
    syncAdminRole
} = require('../middleware/auth');

const router = express.Router();

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));

const safeReturnPath = (value) => {
    const path = String(value || '').trim();

    if (
        !path ||
        !path.startsWith('/') ||
        path.startsWith('//') ||
        path.includes('\\') ||
        path.length > 500
    ) {
        return '/client-flow';
    }

    return path;
};

const safeAuthMode = (value) => (
    String(value || '').toLowerCase() === 'signup'
        ? 'signup'
        : 'login'
);

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

const requestJson = ({ url, method = 'GET', headers = {}, body = '' }) => {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const req = https.request(
            parsedUrl,
            {
                method,
                timeout: 10000,
                headers: {
                    Accept: 'application/json',
                    ...headers
                }
            },
            (response) => {
                let responseBody = '';

                response.on('data', (chunk) => {
                    responseBody += chunk;
                });

                response.on('end', () => {
                    let payload = {};

                    try {
                        payload = responseBody ? JSON.parse(responseBody) : {};
                    } catch {
                        return reject(authError('OAuth provider returned an invalid response.', 502));
                    }

                    if (response.statusCode < 200 || response.statusCode >= 300) {
                        return reject(authError(
                            payload.error_description ||
                            payload.error ||
                            payload.message ||
                            'OAuth provider request failed.',
                            401
                        ));
                    }

                    resolve(payload);
                });
            }
        );

        req.on('timeout', () => {
            req.destroy(authError('OAuth provider request timed out.', 504));
        });
        req.on('error', reject);

        if (body) {
            req.write(body);
        }

        req.end();
    });
};

const getOAuthProviderConfig = (provider) => {
    const providers = {
        github: {
            label: 'GitHub',
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            authUrl: 'https://github.com/login/oauth/authorize',
            tokenUrl: 'https://github.com/login/oauth/access_token',
            scope: 'read:user user:email'
        }
    };

    return providers[provider] || null;
};

const getOAuthApiBaseUrl = (req) => normalizeUrl(
    process.env.OAUTH_API_BASE_URL ||
    `${req.protocol}://${req.get('host')}`
);

const getFrontendBaseUrl = () => normalizeUrl(
    process.env.FRONTEND_URL ||
    'http://localhost:5173'
);

const getOAuthCallbackUrl = (req, provider) =>
    `${getOAuthApiBaseUrl(req)}/api/auth/oauth/${provider}/callback`;

const buildOAuthErrorRedirect = (message, mode = 'login') => {
    const redirectUrl = new URL(`${getFrontendBaseUrl()}/${safeAuthMode(mode)}`);
    redirectUrl.searchParams.set('oauth_error', message || 'Social login failed. Please try again.');
    return redirectUrl.toString();
};

const exchangeOAuthCode = async({ provider, config, code, redirectUri }) => {
    const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
    }).toString();

    const tokenResponse = await requestJson({
        url: config.tokenUrl,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
            ...(provider === 'github' ? { Accept: 'application/json' } : {})
        },
        body
    });

    if (!tokenResponse.access_token) {
        throw authError('OAuth provider did not return an access token.', 401);
    }

    return tokenResponse.access_token;
};

const getGithubProfile = async(accessToken) => {
    const authHeaders = {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'ClientFlow-AI'
    };
    const profile = await requestJson({
        url: 'https://api.github.com/user',
        headers: authHeaders
    });
    const emails = await requestJson({
        url: 'https://api.github.com/user/emails',
        headers: authHeaders
    });
    const verifiedEmail = Array.isArray(emails)
        ? (
            emails.find((item) => item.primary && item.verified && item.email) ||
            emails.find((item) => item.verified && item.email)
        )
        : null;

    if (!verifiedEmail?.email) {
        throw authError('GitHub account does not expose a verified email address.', 401);
    }

    return {
        name: profile.name || profile.login || verifiedEmail.email.split('@')[0],
        email: normalizeEmail(verifiedEmail.email)
    };
};

const fetchOAuthProfile = async(provider, accessToken) => {
    if (provider === 'github') return getGithubProfile(accessToken);

    throw authError('Unsupported OAuth provider.', 404);
};

const findOrCreateOAuthUser = async(profile) => {
    let user = await User.findOne({ email: profile.email });

    if (!user) {
        user = await User.create({
            name: profile.name,
            email: profile.email,
            password: crypto.randomBytes(32).toString('hex')
        });
    } else if (!user.name && profile.name) {
        user.name = profile.name;
        await user.save();
    }

    await syncAdminRole(user);
    return user;
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
// GITHUB OAUTH
// ==========================
router.get(
    '/oauth/:provider/start',
    (req, res) => {
        const provider = String(req.params.provider || '').toLowerCase();
        const config = getOAuthProviderConfig(provider);

        if (!config) {
            return res.status(404).json({ message: 'Unsupported login provider.' });
        }

        if (!config.clientId || !config.clientSecret) {
            return res.status(503).json({
                message: `${config.label} login is not configured on the backend.`
            });
        }

        const returnTo = safeReturnPath(req.query.returnTo);
        const mode = safeAuthMode(req.query.mode);
        const state = jwt.sign(
            {
                provider,
                returnTo,
                mode
            },
            getJwtSecret(),
            {
                expiresIn: '10m'
            }
        );
        const authUrl = new URL(config.authUrl);

        authUrl.searchParams.set('client_id', config.clientId);
        authUrl.searchParams.set('redirect_uri', getOAuthCallbackUrl(req, provider));
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', config.scope);
        authUrl.searchParams.set('state', state);

        res.redirect(authUrl.toString());
    }
);

router.get(
    '/oauth/:provider/callback',
    async(req, res) => {
        const provider = String(req.params.provider || '').toLowerCase();
        const config = getOAuthProviderConfig(provider);
        let redirectMode = 'login';

        try {
            if (!config) {
                throw authError('Unsupported login provider.', 404);
            }

            if (req.query.error) {
                throw authError(req.query.error_description || req.query.error, 401);
            }

            if (!config.clientId || !config.clientSecret) {
                throw authError(`${config.label} login is not configured on the backend.`, 503);
            }

            const statePayload = jwt.verify(String(req.query.state || ''), getJwtSecret());
            if (statePayload.provider !== provider) {
                throw authError('OAuth state mismatch.', 401);
            }
            redirectMode = safeAuthMode(statePayload.mode);

            const code = String(req.query.code || '').trim();
            if (!code) {
                throw authError('Missing OAuth code.', 400);
            }

            const accessToken = await exchangeOAuthCode({
                provider,
                config,
                code,
                redirectUri: getOAuthCallbackUrl(req, provider)
            });
            const profile = await fetchOAuthProfile(provider, accessToken);
            const user = await findOrCreateOAuthUser(profile);
            const appToken = generateToken(user._id);
            const redirectUrl = new URL(`${getFrontendBaseUrl()}/${safeAuthMode(statePayload.mode)}`);

            redirectUrl.hash = new URLSearchParams({
                oauth_token: appToken,
                oauth_provider: provider,
                oauth_return: safeReturnPath(statePayload.returnTo)
            }).toString();

            res.redirect(redirectUrl.toString());
        } catch (err) {
            console.error(`${provider.toUpperCase()} OAUTH ERROR:`, err.message);
            res.redirect(buildOAuthErrorRedirect(
                err.status >= 500
                    ? `${config?.label || 'Social'} login is temporarily unavailable. Please use email login or try again later.`
                    : err.message,
                redirectMode
            ));
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

router.get('/public-profile/:id', async(req, res) => {
    try {
        const id = String(req.params.id || '').trim();

        if (!/^[a-f0-9]{24}$/i.test(id)) {
            return res.status(400).json({ message: 'Invalid profile link.' });
        }

        const user = await User.findById(id)
            .select('name email companyName address logo gstNumber createdAt')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'Profile not found.' });
        }

        const displayName = user.companyName || user.name || 'Freelancer';

        res.json({
            profile: {
                id: user._id,
                displayName,
                name: user.name || '',
                companyName: user.companyName || '',
                email: user.email || '',
                address: user.address || '',
                logo: user.logo || '',
                gstReady: Boolean(user.gstNumber),
                memberSince: user.createdAt,
                services: [
                    'Lead follow-up and client workflow',
                    'Proposal, scope, and approval handling',
                    'Invoice, payment link, and collection tracking'
                ]
            }
        });
    } catch (err) {
        console.error('PUBLIC PROFILE ERROR:', err.message);
        res.status(500).json({ message: 'Unable to load profile.' });
    }
});

// Insecure direct upgrade route removed. 
// Use /payment/razorpay or /payment/request for verified upgrades.

module.exports = router;
