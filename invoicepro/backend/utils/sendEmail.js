const nodemailer = require('nodemailer');

// Create transporter once (better performance)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const getFromAddress = () => {
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'InvoicePro';

    if (!fromEmail) return fromName;

    return `"${fromName}" <${fromEmail}>`;
};

const sendEmail = async(to, subject, content) => {
    try {
        const html = typeof content === 'string' ? content : content?.html;
        const text = typeof content === 'string' ? undefined : content?.text;

        await transporter.sendMail({
            from: getFromAddress(),
            to,
            subject,
            html,
            text
        });

        console.log(
            `📧 Email sent to ${to}`
        );

    } catch (err) {
        console.error(
            '❌ Email error:',
            err.message
        );
    }
};

module.exports = sendEmail;
