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
 * Sends an automated welcome email directly to the newly registered user's email inbox
 */
const sendUserWelcomeEmail = async (user) => {
    if (!user || !user.email) return null;
    const firstName = String(user.name || 'there').trim().split(' ')[0];

    const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #0b0b0f; color: #ffffff; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
  <div style="text-align: center; margin-bottom: 28px;">
    <h1 style="color: #facc15; font-size: 26px; margin: 0 0 8px 0; font-weight: 800; letter-spacing: -0.02em;">ClientFlow AI</h1>
    <p style="color: #a1a1aa; font-size: 14px; margin: 0;">Freelancer Operating System & GST Invoicing</p>
  </div>

  <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <p style="font-size: 16px; line-height: 1.6; margin-top: 0; color: #f4f4f5;">
      Hi <strong>${firstName}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #d4d4d8;">
      Welcome to ClientFlow AI! Your <strong>30-day all-inclusive free workspace</strong> is now officially active.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #d4d4d8;">
      ClientFlow AI is built India-first to solve the 3 biggest problems freelancers face every month:
    </p>

    <div style="margin: 24px 0;">
      <div style="margin-bottom: 18px; padding-left: 12px; border-left: 3px solid #facc15;">
        <strong style="color: #facc15; font-size: 15px;">1. Professional Invoices with Direct UPI QR:</strong>
        <p style="margin: 4px 0 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
          Create Indian GST-compliant invoices with automatic HSN/SAC codes, CGST/SGST splits, and instant Razorpay UPI QR codes so clients can scan and pay right away.
        </p>
      </div>

      <div style="margin-bottom: 18px; padding-left: 12px; border-left: 3px solid #38bdf8;">
        <strong style="color: #38bdf8; font-size: 15px;">2. AI Proposal Generator:</strong>
        <p style="margin: 4px 0 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
          Draft high-converting client proposals in under 60 seconds with clear scope boundaries and payment milestones so you never get stuck doing free revisions.
        </p>
      </div>

      <div style="margin-bottom: 18px; padding-left: 12px; border-left: 3px solid #34d399;">
        <strong style="color: #34d399; font-size: 15px;">3. Calm Payment Follow-Ups:</strong>
        <p style="margin: 4px 0 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
          Keep due dates visible and generate polite, professional WhatsApp and Email payment reminders so you never have to make awkward collection calls.
        </p>
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0 16px;">
      <a href="https://www.clientflowai.in/client-flow" style="display: inline-block; background-color: #facc15; color: #09090b; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 10px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">
        👉 Open My Free Workspace
      </a>
    </div>
  </div>

  <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
    <p style="margin: 0 0 10px 0;">
      <strong>Need help getting started?</strong><br />
      I am Ashieq, builder of ClientFlow AI. If you want any help setting up your payment links, customizing your invoice format, or drafting your first proposal, feel free to reply directly to this email or chat with me on WhatsApp:
    </p>
    <p style="margin: 14px 0;">
      <a href="https://wa.me/917418721245?text=${encodeURIComponent('Hi Ashieq, I just signed up for ClientFlow AI and need help setting up my workspace.')}" style="display: inline-block; background-color: #25D366; color: #ffffff; font-weight: 700; font-size: 13px; padding: 10px 18px; border-radius: 8px; text-decoration: none;">
        💬 Chat with Ashieq on WhatsApp (+91 7418721245)
      </a>
    </p>
    <p style="margin: 18px 0 0 0; font-size: 12px; color: #71717a;">
      ClientFlow AI · Registered under UDYAM-TN-37-0055272 · support@clientflowai.in
    </p>
  </div>
</div>
`;

    const text = `Hi ${firstName},

Welcome to ClientFlow AI! Your 30-day all-inclusive free workspace is now officially active.

ClientFlow AI is built India-first to solve the 3 biggest problems freelancers face every month:
1. Professional Invoices with Direct UPI QR (GST compliant, HSN/SAC codes, CGST/SGST splits)
2. AI Proposal Generator (high-converting proposals in under 60 seconds with clear scope boundaries)
3. Calm Payment Follow-Ups (polite WhatsApp & Email reminders so you get paid on time)

Open your workspace here:
https://www.clientflowai.in/client-flow

Need help getting started?
I am Ashieq, builder of ClientFlow AI. Reply directly to this email or chat with me on WhatsApp: https://wa.me/917418721245

ClientFlow AI · UDYAM-TN-37-0055272 · support@clientflowai.in`;

    return sendEmail(user.email, '👋 Welcome to ClientFlow AI – Your 30-Day Free Workspace is Ready', { html, text });
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

    // 4. Send Automated Welcome Email directly to the newly registered user's inbox
    if (user.email && !user.welcomeEmailSent) {
        try {
            await sendUserWelcomeEmail(user);
            user.welcomeEmailSent = true;
            user.welcomeEmailSentAt = new Date();
            await user.save();
            console.log(`[Welcome] Automated welcome email dispatched to ${user.email}`);
        } catch (userEmailErr) {
            console.error('User welcome email error (non-fatal):', userEmailErr.message);
        }
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
    sendMobileWelcome,
    sendUserWelcomeEmail
};
