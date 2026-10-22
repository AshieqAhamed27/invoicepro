const https = require('https');

/**
 * Normalizes phone number to standard Indian format (e.g., 919876543210)
 */
const normalizePhone = (phone) => {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    return digits;
};

/**
 * High-Converting Onboarding Copy for Indian Freelancers
 */
const getWelcomeMessageText = (name) => {
    const firstName = String(name || 'there').trim().split(' ')[0];
    return `👋 Hi ${firstName}, welcome to ClientFlow AI!

We built ClientFlow AI to solve the 3 biggest headaches Indian freelancers face every month:

1️⃣ Awkward Payment Chasing: Tired of clients delaying payments? ClientFlow sends automated WhatsApp & Email reminders with direct Razorpay UPI links so you never have to ask "Sir, payment update?" again.

2️⃣ Lost Proposals: AI drafts high-converting, professional project proposals in 60 seconds with scope boundaries and payment milestones that clients can sign right on their phone.

3️⃣ Tax & TDS Confusion: Automatically calculates 10% TDS (Section 194J) / 2% (194C) and exports 1-click reports for your CA at tax time.

💡 Why do freelancers pay for Pro (₹499/mo)?
Because recovering just ONE ₹20,000 late invoice pays for ClientFlow AI for 3+ years. No more ghosted proposals. No more unpaid work.

🚀 Get started in 60 seconds:
👉 Create your first invoice or proposal here:
https://www.clientflowai.in/client-flow

Need help setting up your payment links? Just reply directly to this message!`;
};

/**
 * Sends or prepares the welcome message
 */
const sendMobileWelcome = async (user, phoneInput) => {
    const phone = normalizePhone(phoneInput || user.phone);
    if (!phone) {
        return { success: false, reason: 'No phone number provided' };
    }

    const message = getWelcomeMessageText(user.name);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

    // 1. FAST2SMS Integration (if API key is in .env)
    if (process.env.FAST2SMS_API_KEY) {
        try {
            const tenDigit = phone.slice(-10);
            const postData = JSON.stringify({
                route: 'v3',
                sender_id: 'TXTIND',
                message: message.slice(0, 150) + '... Full details: https://www.clientflowai.in',
                language: 'english',
                flash: 0,
                numbers: tenDigit
            });

            const req = https.request({
                hostname: 'www.fast2sms.com',
                path: '/dev/bulkV2',
                method: 'POST',
                headers: {
                    authorization: process.env.FAST2SMS_API_KEY,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (res) => {
                res.on('data', () => {});
            });

            req.on('error', (e) => console.error('Fast2SMS Error:', e.message));
            req.write(postData);
            req.end();
        } catch (smsErr) {
            console.error('SMS Gateway Error:', smsErr);
        }
    }

    // 2. Mark user record
    try {
        user.welcomeMessageSent = true;
        user.welcomeMessageSentAt = new Date();
        user.phone = phone;
        await user.save();
    } catch (dbErr) {
        console.error('Failed to update welcomeMessageSent:', dbErr.message);
    }

    return {
        success: true,
        phone,
        message,
        whatsappUrl
    };
};

module.exports = {
    normalizePhone,
    getWelcomeMessageText,
    sendMobileWelcome
};
