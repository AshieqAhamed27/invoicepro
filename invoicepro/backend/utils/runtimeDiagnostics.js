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

const hasAnyUsableValue = (names = []) => names.some((name) => hasUsableValue(name));
const hasAllUsableValues = (names = []) => names.every((name) => hasUsableValue(name));

const isProductionUrl = (value) => {
    const url = normalizeUrl(value);
    return Boolean(url) && !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(url);
};

const markStartup = ({ entrypoint, port }) => {
    startupState.entrypoint = entrypoint || 'unknown';
    startupState.port = String(port || process.env.PORT || 5000);
    startupState.startedAt = new Date().toISOString();
};

const normalizeAiProvider = (value) => {
    const provider = String(value || 'openai').trim().toLowerCase();
    if (provider === 'anthropic' || provider === 'claude') return 'anthropic';
    if (provider === 'auto') return 'auto';
    return 'openai';
};

const getAiProviderStatus = () => {
    const provider = normalizeAiProvider(process.env.AI_PROVIDER);
    const openAiModel = getEnvValue('OPENAI_MODEL') || 'gpt-5-mini';
    const anthropicModel = getEnvValue('ANTHROPIC_MODEL') || 'claude-sonnet-4-20250514';
    const openAiKey = hasUsableValue('OPENAI_API_KEY');
    const anthropicKey = hasUsableValue('ANTHROPIC_API_KEY');
    const providers = {
        openai: {
            configured: openAiKey,
            model: openAiModel
        },
        anthropic: {
            configured: anthropicKey,
            model: anthropicModel
        }
    };
    const providerOrder = provider === 'anthropic'
        ? ['anthropic', 'openai']
        : provider === 'auto'
            ? ['anthropic', 'openai']
            : ['openai', 'anthropic'];
    const activeProvider = providerOrder.find((item) => providers[item].configured) || '';
    const ready = Boolean(activeProvider);
    const selectedProvider = provider === 'auto' ? activeProvider || providerOrder[0] : provider;
    const usingFallback = ready && provider !== 'auto' && activeProvider !== selectedProvider;
    const activeModel = activeProvider ? providers[activeProvider].model : providers[selectedProvider]?.model || '';

    return {
        provider,
        selectedProvider,
        activeProvider,
        activeModel,
        ready,
        status: ready ? (usingFallback ? 'fallback-ready' : 'ready') : 'missing-key',
        openAiKey,
        openAiModel,
        anthropicKey,
        anthropicModel,
        fallbackAvailable: ready && activeProvider !== selectedProvider,
        action: ready
            ? usingFallback
                ? `${selectedProvider} is selected, but ${activeProvider} is the configured fallback provider.`
                : `${activeProvider || selectedProvider} is configured for AI requests.`
            : 'Add an OpenAI or Anthropic API key in the backend environment.'
    };
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
        ai: getAiProviderStatus(),
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

const getIntegrationStatus = ({ connected, active = false, demo = false, partial = false, optional = false }) => {
    if (active) return 'active';
    if (connected && demo) return 'demo-mode';
    if (connected) return 'connected';
    if (partial) return 'needs-setup';
    if (optional) return 'optional';
    return 'missing-key';
};

const getIntegrationReadiness = () => {
    const envSanity = getEnvSanity();
    const ai = envSanity.ai;
    const razorpayCoreReady = envSanity.payments.razorpayKeyId && envSanity.payments.razorpayKeySecret;
    const razorpayLiveReady = razorpayCoreReady &&
        envSanity.payments.razorpayWebhookSecret &&
        envSanity.payments.razorpayMonthlyPlanId &&
        envSanity.payments.razorpayYearlyPlanId &&
        !envSanity.payments.simulationEnabled;

    const stripeCore = ['STRIPE_SECRET_KEY'];
    const stripeFull = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
    const awsCore = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
    const awsFull = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
    const azureCore = ['AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_CLIENT_SECRET'];
    const azureStorage = ['AZURE_STORAGE_CONNECTION_STRING'];
    const gcpCore = ['GOOGLE_APPLICATION_CREDENTIALS', 'GCP_SERVICE_ACCOUNT_JSON'];
    const gcpProject = ['GCP_PROJECT_ID', 'GOOGLE_CLOUD_PROJECT'];

    const integrations = [{
            id: 'anthropic',
            group: 'AI',
            name: 'Anthropic',
            status: getIntegrationStatus({
                connected: ai.anthropicKey,
                active: ai.activeProvider === 'anthropic'
            }),
            ready: ai.anthropicKey,
            live: ai.anthropicKey,
            detail: ai.activeProvider === 'anthropic'
                ? `Active AI provider using ${ai.anthropicModel}.`
                : ai.anthropicKey
                    ? `Configured with ${ai.anthropicModel}; available for failover or provider switch.`
                    : 'Missing ANTHROPIC_API_KEY in backend environment.',
            action: ai.anthropicKey
                ? 'Keep model and token limits reviewed as usage grows.'
                : 'Set AI_PROVIDER=anthropic, ANTHROPIC_API_KEY, and ANTHROPIC_MODEL when using Claude.',
            env: ['AI_PROVIDER', 'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL']
        },
        {
            id: 'openai',
            group: 'AI',
            name: 'OpenAI',
            status: getIntegrationStatus({
                connected: ai.openAiKey,
                active: ai.activeProvider === 'openai'
            }),
            ready: ai.openAiKey,
            live: ai.openAiKey,
            detail: ai.activeProvider === 'openai'
                ? `Active AI provider using ${ai.openAiModel}.`
                : ai.openAiKey
                    ? `Configured with ${ai.openAiModel}; available for failover or provider switch.`
                    : 'Missing OPENAI_API_KEY in backend environment.',
            action: ai.openAiKey
                ? 'Use AI_PROVIDER=auto when you want fallback between configured providers.'
                : 'Set OPENAI_API_KEY and OPENAI_MODEL when using OpenAI.',
            env: ['AI_PROVIDER', 'OPENAI_API_KEY', 'OPENAI_MODEL']
        },
        {
            id: 'razorpay',
            group: 'Payments',
            name: 'Razorpay',
            status: getIntegrationStatus({
                connected: razorpayCoreReady || envSanity.payments.simulationEnabled,
                demo: envSanity.payments.simulationEnabled,
                partial: hasAnyUsableValue([
                    'RAZORPAY_KEY_ID',
                    'RAZORPAY_KEY_SECRET',
                    'RAZORPAY_WEBHOOK_SECRET',
                    'RAZORPAY_MONTHLY_PLAN_ID',
                    'RAZORPAY_YEARLY_PLAN_ID'
                ])
            }),
            ready: razorpayCoreReady || envSanity.payments.simulationEnabled,
            live: razorpayLiveReady,
            detail: envSanity.payments.simulationEnabled
                ? 'Payment simulation is enabled, so checkout can be tested without real collection.'
                : razorpayLiveReady
                    ? 'Live keys, webhook secret, and subscription plan IDs are configured.'
                    : 'Razorpay is not fully live until keys, webhook secret, and plan IDs are configured.',
            action: razorpayLiveReady
                ? 'Run a real low-value payment test before paid launch.'
                : envSanity.payments.simulationEnabled
                    ? 'Set PAYMENT_SIMULATION=false and add live Razorpay values before real sales.'
                    : 'Add Razorpay key ID, key secret, webhook secret, monthly plan ID, and yearly plan ID.',
            env: [
                'PAYMENT_SIMULATION',
                'RAZORPAY_KEY_ID',
                'RAZORPAY_KEY_SECRET',
                'RAZORPAY_WEBHOOK_SECRET',
                'RAZORPAY_MONTHLY_PLAN_ID',
                'RAZORPAY_YEARLY_PLAN_ID'
            ]
        },
        {
            id: 'stripe',
            group: 'Billing API',
            name: 'Stripe',
            status: getIntegrationStatus({
                connected: hasAllUsableValues(stripeFull),
                partial: hasAnyUsableValue(stripeCore) || hasAnyUsableValue(stripeFull)
            }),
            ready: hasAllUsableValues(stripeFull),
            live: hasAllUsableValues(stripeFull),
            detail: hasAllUsableValues(stripeFull)
                ? 'Stripe secret and webhook secret are present for a future billing route.'
                : 'Stripe is not wired into the product checkout yet; this checks env readiness only.',
            action: 'Add Stripe checkout routes only when global card billing is selected for launch.',
            env: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_YEARLY']
        },
        {
            id: 'aws',
            group: 'Cloud',
            name: 'AWS',
            status: getIntegrationStatus({
                connected: hasAllUsableValues(awsFull),
                partial: hasAnyUsableValue(awsCore) || hasUsableValue('AWS_REGION')
            }),
            ready: hasAllUsableValues(awsFull),
            live: hasAllUsableValues(awsFull),
            detail: hasAllUsableValues(awsFull)
                ? 'AWS credentials and region are present for cloud workflows.'
                : 'AWS is optional unless you add storage, deployment, or billing-provider automation.',
            action: 'Add scoped IAM credentials only for the exact AWS workflow you plan to automate.',
            env: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_BUCKET_NAME']
        },
        {
            id: 'azure',
            group: 'Cloud',
            name: 'Azure',
            status: getIntegrationStatus({
                connected: hasAllUsableValues(azureCore) || hasAnyUsableValue(azureStorage),
                partial: hasAnyUsableValue(azureCore) || hasAnyUsableValue(azureStorage)
            }),
            ready: hasAllUsableValues(azureCore) || hasAnyUsableValue(azureStorage),
            live: hasAllUsableValues(azureCore) || hasAnyUsableValue(azureStorage),
            detail: hasAllUsableValues(azureCore) || hasAnyUsableValue(azureStorage)
                ? 'Azure credentials are present for future cloud workflows.'
                : 'Azure is optional until the product needs Microsoft cloud deployment or storage automation.',
            action: 'Add Azure credentials only after choosing a Microsoft cloud workflow.',
            env: ['AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_STORAGE_CONNECTION_STRING']
        },
        {
            id: 'gcp',
            group: 'Cloud',
            name: 'GCP',
            status: getIntegrationStatus({
                connected: hasAnyUsableValue(gcpCore) && hasAnyUsableValue(gcpProject),
                partial: hasAnyUsableValue(gcpCore) || hasAnyUsableValue(gcpProject)
            }),
            ready: hasAnyUsableValue(gcpCore) && hasAnyUsableValue(gcpProject),
            live: hasAnyUsableValue(gcpCore) && hasAnyUsableValue(gcpProject),
            detail: hasAnyUsableValue(gcpCore) && hasAnyUsableValue(gcpProject)
                ? 'GCP credentials and project are present for cloud workflows.'
                : 'GCP is optional until the product needs Google Cloud deployment, storage, or AI workflow automation.',
            action: 'Add a scoped service account only for the exact GCP workflow you plan to automate.',
            env: ['GOOGLE_APPLICATION_CREDENTIALS', 'GCP_SERVICE_ACCOUNT_JSON', 'GCP_PROJECT_ID', 'GOOGLE_CLOUD_PROJECT']
        }
    ];

    const requiredForCurrentProduct = integrations.filter((item) => ['anthropic', 'openai', 'razorpay'].includes(item.id));
    const liveCount = integrations.filter((item) => item.live).length;
    const readyCount = integrations.filter((item) => item.ready).length;
    const currentReadyCount = requiredForCurrentProduct.filter((item) => item.ready).length;

    return {
        score: Math.round((readyCount / integrations.length) * 100),
        currentProductScore: Math.round((currentReadyCount / requiredForCurrentProduct.length) * 100),
        liveCount,
        readyCount,
        total: integrations.length,
        generatedAt: new Date().toISOString(),
        note: 'Readiness checks only expose boolean configuration state and never return secret values.',
        integrations
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
            label: 'AI provider assistant',
            ready: envSanity.ai.ready,
            severity: 'important',
            action: envSanity.ai.action
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
    getAiProviderStatus,
    getEnvSanity,
    getIntegrationReadiness,
    getLaunchReadiness,
    markStartup,
    startupState
};
