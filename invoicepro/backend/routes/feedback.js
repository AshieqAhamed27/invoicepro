const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');

router.post('/', protect, async (req, res) => {
    try {
        const { message, category, rating } = req.body;
        const user = req.user;

        if (!message) {
            return res.status(400).json({ message: 'Feedback message is required.' });
        }

        // Get admin emails from env or fallback
        const adminEmails = process.env.ADMIN_EMAILS || 'ashieqahamed4@gmail.com';
        
        const subject = `[ClientFlow AI Feedback] New ${category || 'Feedback'} from ${user.name}`;
        const html = `
            <h2>New Product Feedback</h2>
            <p><strong>User:</strong> ${user.name} (${user.email})</p>
            <p><strong>Category:</strong> ${category || 'General'}</p>
            <p><strong>Rating:</strong> ${rating ? rating + '/5' : 'N/A'}</p>
            <hr />
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
        `;

        // sendEmail works with comma-separated recipients out of the box (nodemailer supports it)
        await sendEmail(adminEmails, subject, html);

        res.status(200).json({ message: 'Feedback sent successfully.' });
    } catch (err) {
        console.error('Feedback Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
