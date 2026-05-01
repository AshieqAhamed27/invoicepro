const nodemailer = require('nodemailer');

let cachedTransporter = null;
let cachedKey = '';
const EMAIL_SEND_TIMEOUT_MS = Math.min(
    Math.max(Number(process.env.EMAIL_SEND_TIMEOUT_MS || 15000), 5000),
    30000
);

const withTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
        const error = new Error(`Email provider timed out after ${Math.round(timeoutMs / 1000)} seconds. Check Gmail app password/settings or try again.`);
        error.code = 'EMAIL_SEND_TIMEOUT';
        error.status = 504;
        reject(error);
    }, timeoutMs);

    promise.then(
        (value) => {
            clearTimeout(timer);
            resolve(value);
        },
        (error) => {
            clearTimeout(timer);
            reject(error);
        }
    );
});

const getEmailConfig = () => {
    const user = String(process.env.EMAIL_USER || '').trim();
    const pass = String(process.env.EMAIL_PASS || '').replace(/\s+/g, '');

    if (!user || !pass) {
        throw new Error('Email is not configured. Add EMAIL_USER and EMAIL_PASS in backend environment variables.');
    }

    return { user, pass };
};

const getTransporter = () => {
    const config = getEmailConfig();
    const key = `${config.user}:${config.pass}`;

    if (!cachedTransporter || cachedKey !== key) {
        cachedTransporter = nodemailer.createTransport({
            service: 'gmail',
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: EMAIL_SEND_TIMEOUT_MS,
            auth: config
        });
        cachedKey = key;
    }

    return cachedTransporter;
};

const getFromAddress = () => {
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'InvoicePro';

    if (!fromEmail) return fromName;

    return `"${fromName}" <${fromEmail}>`;
};

const sendEmail = async(to, subject, content) => {
    try {
        const recipient = String(to || '').trim();
        if (!recipient || !recipient.includes('@')) {
            throw new Error('Client email is missing or invalid.');
        }

        const html = typeof content === 'string' ? content : content?.html;
        const text = typeof content === 'string' ? undefined : content?.text;

        const info = await withTimeout(getTransporter().sendMail({
            from: getFromAddress(),
            to: recipient,
            subject,
            html,
            text
        }), EMAIL_SEND_TIMEOUT_MS);

        console.log(`Email sent to ${recipient}`);
        return info;
    } catch (err) {
        console.error('Email error:', err.message);
        if (err.code === 'EMAIL_SEND_TIMEOUT' && cachedTransporter?.close) {
            cachedTransporter.close();
            cachedTransporter = null;
            cachedKey = '';
        }
        throw err;
    }
};

module.exports = sendEmail;
