const express = require('express');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ✅ USER CLICK "I PAID"
router.post('/request', protect, async(req, res) => {
    try {
        const payment = await Payment.create({
            user: req.user._id
        });

        res.json({
            message: 'Payment request submitted',
            payment
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ ADMIN APPROVE
router.put('/approve/:id', async(req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ message: 'Not found' });
        }

        payment.status = 'approved';
        await payment.save();

        // 🔥 UPGRADE USER
        await User.findByIdAndUpdate(payment.user, {
            plan: 'pro'
        });

        res.json({ message: 'User upgraded to PRO' });

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ GET ALL REQUESTS
router.get('/', async(req, res) => {
    const payments = await Payment.find().populate('user');
    res.json({ payments });
});

module.exports = router;