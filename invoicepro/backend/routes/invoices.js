const express = require('express');
const Invoice = require('../models/Invoice');
const { protect } = require('../middleware/auth');

const router = express.Router();

const FREE_PLAN_LIMIT = 2;

// Generate invoice number
const generateInvoiceNumber = (count) => {
    const num = String(count + 1).padStart(4, '0');
    return `INV-${num}`;
};

// GET /api/invoices — get all invoices for logged-in user
router.get('/', protect, async(req, res) => {
    try {
        const invoices = await Invoice.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json({ invoices, count: invoices.length });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET /api/invoices/:id — get single invoice
router.get('/:id', protect, async(req, res) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user._id });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
        res.json({ invoice });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/invoices — create invoice
router.post('/', protect, async(req, res) => {
    try {
        const user = req.user;

        // 🔥 COUNT USER INVOICES
        const count = await Invoice.countDocuments({ user: user._id });

        // 🔥 LIMIT FREE USERS
        if (user.plan === 'free' && count >= 2) {
            return res.status(403).json({
                message: 'Free plan limit reached',
                limitReached: true
            });
        }

        const invoice = await Invoice.create({
            ...req.body,
            user: user._id
        });

        res.status(201).json({ invoice });

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});
// PUT /api/invoices/:id/status — update invoice status
router.put('/:id/status', protect, async(req, res) => {
    try {
        const invoice = await Invoice.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { status: req.body.status }, { new: true });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
        res.json({ message: 'Status updated!', invoice });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// DELETE /api/invoices/:id
router.delete('/:id', protect, async(req, res) => {
    try {
        const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
        res.json({ message: 'Invoice deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router;