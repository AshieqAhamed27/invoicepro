const https = require('https');
const sendEmail = require('./sendEmail');

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

    // 3. Immediately alert Ashieq with 1-click WhatsApp button to chat directly from your number
    const founderWaLink = `https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${user.name || 'there'}! I'm Ashieq, builder of ClientFlow AI. Saw you just joined with your mobile number! How can I help you set up your first invoice or proposal today?`)}`;
    try {
        const adminEmail = process.env.ADMIN_EMAILS || 'ashieqahamed4@gmail.com';
        await sendEmail(
            adminEmail,
            `🚀 New User Phone Login: ${user.name || 'User'} (+${phone})`,
            `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #0f172a; margin-top: 0;">🚀 New Mobile User Activity on ClientFlow AI</h2>
                <p style="color: #475569; font-size: 14px;">A user just registered or logged in with their mobile number:</p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Name:</strong> ${user.name || 'Unnamed'}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> ${user.email || 'N/A'}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>WhatsApp:</strong> <span style="color: #059669; font-weight: bold;">+${phone}</span></p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
                </div>
                <p style="color: #475569; font-size: 14px; margin-top: 20px;">Tap below on your phone or computer to immediately start chatting with them from your personal WhatsApp:</p>
                <div style="margin: 24px 0; text-align: center;">
                    <a href="${founderWaLink}" style="background-color: #25D366; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                        💬 Open WhatsApp Chat with +${phone}
                    </a>
                </div>
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">Message will be sent directly from your own WhatsApp number.</p>
            </div>`
        );
    } catch (notifyErr) {
        console.error('Founder notification email error (non-fatal):', notifyErr.message);
    }

    return {
        success: true,
        phone,
        message,
        whatsappUrl,
        founderWaLink
    };
};

module.exports = {
    normalizePhone,
    getWelcomeMessageText,
    sendMobileWelcome
};
