const express = require('express');
const Invoice = require('../models/Invoice');
const { protect } = require('../middleware/auth');

const sendEmail = require('../utils/sendEmail');

const router = express.Router();

const FREE_PLAN_LIMIT = 2;

// ✅ Generate invoice number
const generateInvoiceNumber = (count) => {
    const num = String(count + 1).padStart(4, '0');
    return `INV-${num}`;
};

// ==========================
// 📄 GET ALL INVOICES
// ==========================
router.get('/', protect, async(req, res) => {
    try {
        const invoices = await Invoice.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json({ invoices, count: invoices.length });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// ==========================
// 📄 GET SINGLE INVOICE
// ==========================
router.get('/:id', protect, async(req, res) => {
    try {
        const invoice = await Invoice.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found.' });
        }

        res.json({ invoice });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// ==========================
// ➕ CREATE INVOICE
// ==========================
router.post('/', protect, async(req, res) => {
    try {
        const user = req.user;

        if (!user || !user._id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const count = await Invoice.countDocuments({ user: user._id });

        // 🔥 LIMIT FREE USERS
        if (user.plan === 'free' && count >= FREE_PLAN_LIMIT) {
            return res.status(403).json({
                message: 'Free plan limit reached',
                limitReached: true
            });
        }

        // 🔥 GENERATE NUMBER
        const invoiceNumber = generateInvoiceNumber(count);

        const {
            clientName,
            clientEmail,
            serviceDescription,
            amount,
            currency,
            date,
            dueDate,
            notes,
            logo
        } = req.body;

        // ✅ VALIDATION
        if (!clientName || !clientEmail || !amount) {
            return res.status(400).json({
                message: 'Missing required fields'
            });
        }

        const invoice = await Invoice.create({
            clientName,
            clientEmail,
            serviceDescription,
            amount,
            currency,
            date,
            dueDate,
            notes,
            logo: logo || null,
            invoiceNumber: invoiceNumber || `INV-${Date.now()}`, // ✅ SAFE FIX
            user: user._id
        });

        await sendEmail(
            clientEmail,
            "New Invoice",
            `<h2>You received an invoice</h2>
   <p>Amount: ₹${amount}</p>`
        );

        res.status(201).json({ invoice });

    } catch (err) {
        console.error("🔥 CREATE INVOICE ERROR:", err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==========================
// 🔄 UPDATE STATUS
// ==========================
router.put('/:id/status', protect, async(req, res) => {
    try {
        const invoice = await Invoice.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { status: req.body.status }, { new: true });

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found.' });
        }

        res.json({ message: 'Status updated!', invoice });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// ==========================
// ❌ DELETE
// ==========================
router.delete('/:id', protect, async(req, res) => {
    try {
        const invoice = await Invoice.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found.' });
        }

        res.json({ message: 'Invoice deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router;