const express = require('express');
const PaymentRequest = require('../models/PaymentRequest');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();


// ==========================
// ➕ CREATE PAYMENT REQUEST
// ==========================
router.post('/request', protect, async(req, res) => {
    try {
        const existing = await PaymentRequest.findOne({
            user: req.user._id,
            status: 'pending'
        });

        if (existing) {
            return res.status(400).json({
                message: 'Already requested'
            });
        }

        const request = await PaymentRequest.create({
            user: req.user._id
        });

        res.json({
            message: 'Request sent successfully',
            request
        });

    } catch (err) {
        console.error("🔥 PAYMENT REQUEST ERROR:", err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ==========================
// 📄 GET ALL REQUESTS (ADMIN)
// ==========================
router.get('/', async(req, res) => {
    try {
        const requests = await PaymentRequest.find()
            .populate('user', 'name email plan')
            .sort({ createdAt: -1 });

        res.json({ requests });

    } catch (err) {
        console.error("🔥 FETCH REQUEST ERROR:", err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ==========================
// ✅ APPROVE PAYMENT
// ==========================
router.put('/approve/:id', async(req, res) => {
    try {
        const request = await PaymentRequest.findById(req.params.id).populate('user');

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.status === 'approved') {
            return res.status(400).json({ message: 'Already approved' });
        }

        // 🔥 UPGRADE USER
        request.user.plan = 'pro';
        await request.user.save();

        // 🔥 UPDATE REQUEST
        request.status = 'approved';
        await request.save();

        res.json({ message: 'User upgraded to PRO successfully' });

    } catch (err) {
        console.error("🔥 APPROVE ERROR:", err);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;