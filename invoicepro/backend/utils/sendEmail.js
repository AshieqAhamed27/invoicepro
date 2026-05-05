const nodemailer = require('nodemailer');
const dns = require('dns');
const https = require('https');

if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
}

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
    const host = String(process.env.EMAIL_HOST || 'smtp.gmail.com').trim();
    const port = Number(process.env.EMAIL_PORT || 587);
    const secure = process.env.EMAIL_SECURE !== undefined
        ? ['1', 'true', 'yes'].includes(String(process.env.EMAIL_SECURE).toLowerCase())
        : port === 465;

    if (!user || !pass) {
        throw new Error('Email is not configured. Add EMAIL_USER and EMAIL_PASS in backend environment variables.');
    }

    return { user, pass, host, port, secure };
};

const getTransporter = () => {
    const config = getEmailConfig();
    const key = `${config.user}:${config.pass}`;

    if (!cachedTransporter || cachedKey !== key) {
        cachedTransporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            family: 4,
            requireTLS: !config.secure,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: EMAIL_SEND_TIMEOUT_MS,
            auth: {
                user: config.user,
                pass: config.pass
            },
            tls: {
                servername: config.host
            }
        });
        cachedKey = key;
    }

    return cachedTransporter;
};

const getFromAddress = () => {
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'ClientFlow AI';

    if (!fromEmail) return fromName;

    return `"${fromName}" <${fromEmail}>`;
};

const getResendFromAddress = () => process.env.RESEND_FROM || getFromAddress();

const sendWithResend = async({ to, subject, html, text }) => {
    const apiKey = String(process.env.RESEND_API_KEY || '').trim();
    if (!apiKey) return null;

    const payload = JSON.stringify({
        from: getResendFromAddress(),
        to: [to],
        subject,
        html,
        text
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.resend.com',
            path: '/emails',
            method: 'POST',
            family: 4,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                let parsed = {};
                try {
                    parsed = body ? JSON.parse(body) : {};
                } catch {
                    parsed = { message: body || 'Invalid Resend response' };
                }

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    return resolve(parsed);
                }

                const message = parsed?.message || parsed?.error?.message || parsed?.error || 'Resend email failed';
                const error = new Error(message);
                error.status = res.statusCode || 500;
                error.provider = 'resend';
                reject(error);
            });
        });

        req.setTimeout(EMAIL_SEND_TIMEOUT_MS, () => {
            req.destroy(new Error(`Resend timed out after ${Math.round(EMAIL_SEND_TIMEOUT_MS / 1000)} seconds.`));
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
};

const sendEmail = async(to, subject, content) => {
    try {
        const recipient = String(to || '').trim();
        if (!recipient || !recipient.includes('@')) {
            throw new Error('Client email is missing or invalid.');
        }

        const html = typeof content === 'string' ? content : content?.html;
        const text = typeof content === 'string' ? undefined : content?.text;

        const resendInfo = await sendWithResend({
            to: recipient,
            subject,
            html,
            text
        });

        if (resendInfo) {
            console.log(`Email sent via Resend to ${recipient}`);
            return resendInfo;
        }

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
