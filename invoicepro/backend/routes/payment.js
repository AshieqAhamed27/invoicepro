const express = require('express');
const router = express.Router();
const multer = require('multer');

const { protect } = require('../middleware/auth');
const User = require('../models/User');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

let paymentRequests = [];

// ==========================
// SEND PAYMENT REQUEST
// ==========================
router.post('/request', protect, upload.single('screenshot'), async(req, res) => {
    try {
        const { plan } = req.body;

        if (!req.file) {
            return res.status(400).json({
                message: 'Screenshot required'
            });
        }

        const request = {
            id: Date.now(),
            userId: req.user._id,
            file: req.file.filename,
            plan,
            status: 'pending'
        };

        paymentRequests.push(request);

        res.json({
            message: 'Payment request submitted'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

// ==========================
// GET ALL REQUESTS (ADMIN)
// ==========================
router.get('/requests', (req, res) => {
    res.json(paymentRequests);
});

// ==========================
// APPROVE PAYMENT
// ==========================
router.put('/approve/:id', async(req, res) => {
    try {
        const id = Number(req.params.id);

        const request = paymentRequests.find(r => r.id === id);

        if (!request) {
            return res.status(404).json({
                message: 'Request not found'
            });
        }

        request.status = 'approved';

        // 🔥 UPDATE USER PLAN
        const user = await User.findById(request.userId);

        if (user) {
            user.plan = request.plan; // monthly / yearly
            await user.save();
        }

        res.json({
            message: 'Payment approved & user upgraded',
            request
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

module.exports = router;