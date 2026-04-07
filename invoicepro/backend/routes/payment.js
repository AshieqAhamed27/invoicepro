const express = require('express');
const PaymentRequest = require('../models/PaymentRequest');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'yourgmail@gmail.com',
        pass: 'your-app-password'
    }
});

const multer = require('multer');

// storage config
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

const router = express.Router();

// 🔐 YOUR ADMIN EMAIL
const ADMIN_EMAIL = "ashieqahamed27@gmail.com";

// 🔐 ADMIN CHECK
const isAdmin = (req) => {
    return req.user && req.user.email === ADMIN_EMAIL;
};


// ==========================
// ➕ CREATE PAYMENT REQUEST
// ==========================
router.post('/request', protect, upload.single('screenshot'), async(req, res) => {
    try {

        const existing = await PaymentRequest.findOne({
            user: req.user._id,
            status: 'pending'
        });

        if (existing) {
            return res.status(400).json({ message: 'Already requested' });
        }

        const request = await PaymentRequest.create({
            user: req.user._id,
            screenshot: req.file ? req.file.filename : null
        });

        res.json({
            message: 'Request sent successfully',
            request
        });

        await transporter.sendMail({
            from: 'yourgmail@gmail.com',
            to: 'yourgmail@gmail.com',
            subject: 'New Payment Request',
            text: `User ${req.user.email} submitted payment proof`
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ==========================
// 📄 GET ALL REQUESTS (ADMIN)
// ==========================
router.get('/', protect, async(req, res) => {

    // 🔐 ADMIN CHECK
    if (!isAdmin(req)) {
        return res.status(403).json({ message: 'Access denied ❌' });
    }

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
// ✅ APPROVE PAYMENT (ADMIN)
// ==========================
router.put('/approve/:id', protect, async(req, res) => {

    // 🔐 ADMIN CHECK
    if (!isAdmin(req)) {
        return res.status(403).json({ message: 'Access denied ❌' });
    }

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