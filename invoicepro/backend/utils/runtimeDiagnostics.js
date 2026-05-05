const { getAllowedOrigins, normalizeUrl } = require('./env');

const PRICING_VERSION = '2026-04-22';

const startupState = {
    entrypoint: 'not-started',
    port: null,
    startedAt: null
};

const CONNECTION_STATES = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
};

const getEnvValue = (name) => String(process.env[name] || '').trim();

const looksLikePlaceholder = (value) => {
    const normalized = String(value || '').trim().toLowerCase();

    if (!normalized) return true;

    return [
        'your_',
        'change_this',
        'paste_',
        'example',
        'xxxxx',
        'rzp_test_your',
        'sk-xxxxx',
        'mongodb+srv://username:password'
    ].some((token) => normalized.includes(token));
};

const hasValue = (name) => Boolean(getEnvValue(name));
const hasUsableValue = (name) => {
    const value = getEnvValue(name);
    return Boolean(value) && !looksLikePlaceholder(value);
};

const isProductionUrl = (value) => {
    const url = normalizeUrl(value);
    return Boolean(url) && !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(url);
};

const markStartup = ({ entrypoint, port }) => {
    startupState.entrypoint = entrypoint || 'unknown';
    startupState.port = String(port || process.env.PORT || 5000);
    startupState.startedAt = new Date().toISOString();
};

const getEnvSanity = () => {
    const allowedOrigins = getAllowedOrigins();

    return {
        required: {
            mongoUri: hasUsableValue('MONGO_URI'),
            jwtSecret: hasUsableValue('JWT_SECRET'),
            frontendUrl: hasUsableValue('FRONTEND_URL')
        },
        payments: {
            simulationEnabled: process.env.PAYMENT_SIMULATION === 'true',
            razorpayKeyId: hasUsableValue('RAZORPAY_KEY_ID'),
            razorpayKeySecret: hasUsableValue('RAZORPAY_KEY_SECRET'),
            razorpayWebhookSecret: hasUsableValue('RAZORPAY_WEBHOOK_SECRET'),
            razorpayMonthlyPlanId: hasUsableValue('RAZORPAY_MONTHLY_PLAN_ID'),
            razorpayYearlyPlanId: hasUsableValue('RAZORPAY_YEARLY_PLAN_ID')
        },
        ai: {
            openAiKey: hasUsableValue('OPENAI_API_KEY'),
            openAiModel: process.env.OPENAI_MODEL || null
        },
        email: {
            emailUser: hasUsableValue('EMAIL_USER'),
            emailPass: hasUsableValue('EMAIL_PASS'),
            emailFrom: hasUsableValue('EMAIL_FROM') || hasUsableValue('EMAIL_USER'),
            resendApiKey: hasUsableValue('RESEND_API_KEY'),
            resendFrom: hasUsableValue('RESEND_FROM')
        },
        recurring: {
            cronSecret: hasUsableValue('CRON_SECRET')
        },
        cors: {
            frontendUrl: normalizeUrl(process.env.FRONTEND_URL) || null,
            productionFrontend: isProductionUrl(process.env.FRONTEND_URL),
            configuredOrigins: allowedOrigins,
            wildcardOrigins: allowedOrigins.filter((origin) => origin.includes('*')),
            allowedOriginCount: allowedOrigins.length
        }
    };
};

const getConnectionStateLabel = (readyState) => CONNECTION_STATES[readyState] || 'unknown';

const getLaunchReadiness = ({ databaseState = 'unknown' } = {}) => {
    const envSanity = getEnvSanity();
    const paymentLiveReady = !envSanity.payments.simulationEnabled &&
        envSanity.payments.razorpayKeyId &&
        envSanity.payments.razorpayKeySecret &&
        envSanity.payments.razorpayWebhookSecret &&
        envSanity.payments.razorpayMonthlyPlanId &&
        envSanity.payments.razorpayYearlyPlanId;

    const checks = [{
            id: 'database',
            category: 'Core',
            label: 'MongoDB Atlas connection',
            ready: databaseState === 'connected',
            severity: 'blocker',
            action: 'Confirm Render outbound IPs are allowed in MongoDB Atlas.'
        },
        {
            id: 'auth',
            category: 'Core',
            label: 'JWT secret configured',
            ready: envSanity.required.jwtSecret,
            severity: 'blocker',
            action: 'Set a strong JWT_SECRET in Render.'
        },
        {
            id: 'frontend',
            category: 'Deployment',
            label: 'Production frontend URL',
            ready: envSanity.cors.productionFrontend,
            severity: 'blocker',
            action: 'Set FRONTEND_URL to the live Vercel domain.'
        },
        {
            id: 'cors',
            category: 'Deployment',
            label: 'Frontend allowed by CORS',
            ready: envSanity.cors.allowedOriginCount > 0,
            severity: 'blocker',
            action: 'Add the Vercel domain to CORS_ORIGINS.'
        },
        {
            id: 'subscriptions',
            category: 'Revenue',
            label: 'Razorpay subscriptions live',
            ready: paymentLiveReady,
            severity: 'blocker',
            action: envSanity.payments.simulationEnabled ?
                'Set PAYMENT_SIMULATION=false in Render for real payments.' :
                'Add Razorpay keys, plan IDs, and webhook secret in Render.'
        },
        {
            id: 'email',
            category: 'Revenue',
            label: 'Invoice email delivery',
            ready: envSanity.email.emailUser && envSanity.email.emailPass && envSanity.email.emailFrom,
            severity: 'important',
            action: 'Add Gmail app password or production SMTP values.'
        },
        {
            id: 'ai',
            category: 'AI',
            label: 'OpenAI billing assistant',
            ready: envSanity.ai.openAiKey && Boolean(envSanity.ai.openAiModel),
            severity: 'important',
            action: 'Add OPENAI_API_KEY and OPENAI_MODEL.'
        },
        {
            id: 'recurring',
            category: 'Retention',
            label: 'Recurring invoice cron secret',
            ready: envSanity.recurring.cronSecret,
            severity: 'important',
            action: 'Set CRON_SECRET and schedule the recurring invoice job.'
        }
    ];

    const completed = checks.filter((check) => check.ready).length;
    const score = Math.round((completed / checks.length) * 100);
    const blockers = checks.filter((check) => !check.ready && check.severity === 'blocker');

    return {
        score,
        stage: score >= 90 ? 'ready-to-sell' : score >= 70 ? 'nearly-ready' : 'setup-needed',
        moneyReady: blockers.length === 0 && paymentLiveReady,
        webhookPath: '/api/payment/webhook',
        webhookUrlHint: 'https://your-render-backend.onrender.com/api/payment/webhook',
        checks,
        blockers,
        generatedAt: new Date().toISOString()
    };
};

module.exports = {
    PRICING_VERSION,
    getConnectionStateLabel,
    getEnvSanity,
    getLaunchReadiness,
    markStartup,
    startupState
};
