const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const { getJwtSecret } = require('../utils/env');

const resolveUser = async (req) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, getJwtSecret());
            if (decoded && decoded.id) {
                return await User.findById(decoded.id).select('-password');
            }
        }
    } catch {
        // guest or expired token
    }
    return null;
};

// POST /api/feedback - Submit a review or feedback with 1-5 stars
router.post('/', async (req, res) => {
    try {
        const user = req.user || await resolveUser(req);
        const {
            message,
            category = 'Review',
            rating = 5,
            name = '',
            email = '',
            phone = '',
            postedToGoogle = false,
            source = 'in_app_modal'
        } = req.body;

        if (!message || !String(message).trim()) {
            return res.status(400).json({ message: 'Feedback or review message is required.' });
        }

        const numericRating = Math.min(Math.max(Number(rating) || 5, 1), 5);
        const userName = (user && user.name) || name.trim() || 'ClientFlow User';
        const userEmail = (user && user.email) || email.trim() || '';
        const userPhone = (user && user.phone) || phone.trim() || '';

        const feedback = await Feedback.create({
            user: user ? user._id : null,
            name: userName,
            email: userEmail,
            phone: userPhone,
            rating: numericRating,
            category: category.trim() || 'Review',
            message: String(message).trim(),
            postedToGoogle: Boolean(postedToGoogle),
            source
        });

        // Send alert email to Admin
        const adminEmails = process.env.ADMIN_EMAILS || 'ashieqahamed4@gmail.com';
        const starsText = '⭐'.repeat(numericRating);
        const subject = `[ClientFlow AI ${numericRating}★ Review] ${category} from ${userName}`;
        
        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #0f172a; margin-top: 0;">New User Review & Rating</h2>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 4px 0; font-size: 18px;"><strong>Rating:</strong> <span style="color: #eab308; font-size: 20px;">${starsText}</span> (${numericRating}/5)</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>User:</strong> ${userName}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> ${userEmail || 'N/A'}</p>
                    ${userPhone ? `<p style="margin: 4px 0; font-size: 14px;"><strong>WhatsApp:</strong> +${userPhone}</p>` : ''}
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Category:</strong> ${category}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Shared to Google:</strong> ${postedToGoogle ? 'Yes ✅' : 'No'}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
                </div>
                <div style="margin: 16px 0; padding: 16px; background-color: #fffbeb; border-left: 4px solid #facc15; border-radius: 4px;">
                    <p style="margin: 0; color: #1e293b; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">"${message}"</p>
                </div>
                ${userPhone ? `
                <div style="margin-top: 20px; text-align: center;">
                    <a href="https://wa.me/${userPhone}?text=${encodeURIComponent(`Hi ${userName}! Ashieq here from ClientFlow AI. Thank you so much for your review!`)}" style="background-color: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                        💬 Reply to User on WhatsApp (+${userPhone})
                    </a>
                </div>` : ''}
            </div>
        `;

        sendEmail(adminEmails, subject, html).catch((err) => {
            console.error('[Feedback Email Alert Error]:', err.message);
        });

        res.status(201).json({
            success: true,
            message: 'Feedback received successfully! Thank you for rating ClientFlow AI.',
            id: feedback._id
        });
    } catch (err) {
        console.error('Feedback submission error:', err);
        res.status(500).json({ message: 'Failed to submit feedback.' });
    }
});

// GET /api/feedback - List all reviews & feedback for Admin
router.get('/', protect, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required.' });
        }

        const items = await Feedback.find().sort({ createdAt: -1 }).limit(100);
        const total = await Feedback.countDocuments();
        
        let avgRating = 5;
        if (items.length > 0) {
            const sum = items.reduce((acc, curr) => acc + (curr.rating || 5), 0);
            avgRating = Number((sum / items.length).toFixed(1));
        }

        res.json({
            total,
            avgRating,
            items
        });
    } catch (err) {
        console.error('Feedback list error:', err);
        res.status(500).json({ message: 'Failed to load feedbacks.' });
    }
});

module.exports = router;
