const nodemailer = require('nodemailer');

let cachedTransporter = null;
let cachedKey = '';

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

        const info = await getTransporter().sendMail({
            from: getFromAddress(),
            to: recipient,
            subject,
            html,
            text
        });

        console.log(`Email sent to ${recipient}`);
        return info;
    } catch (err) {
        console.error('Email error:', err.message);
        throw err;
    }
};

module.exports = sendEmail;
