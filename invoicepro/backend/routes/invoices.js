const express = require('express');
const Invoice = require('../models/Invoice');
const { protect } = require('../middleware/auth');

const router = express.Router();
const sendEmail = require('../utils/sendEmail');

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
        const invoices = await Invoice.find({
            user: req.user._id
        }).sort({ createdAt: -1 });

        res.json({
            invoices,
            count: invoices.length
        });
    } catch (err) {
        console.error('🔥 GET INVOICES ERROR:', err);
        res.status(500).json({
            message: 'Server error.'
        });
    }
});

// ==========================
// 🌐 PUBLIC INVOICE VIEW
// ==========================
router.get('/public/:id', async(req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                message: 'Invoice not found.'
            });
        }

        res.json({ invoice });
    } catch (err) {
        console.error('🔥 PUBLIC INVOICE ERROR:', err);
        res.status(500).json({
            message: 'Server error.'
        });
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
            return res.status(404).json({
                message: 'Invoice not found.'
            });
        }

        res.json({ invoice });
    } catch (err) {
        console.error('🔥 GET SINGLE ERROR:', err);
        res.status(500).json({
            message: 'Server error.'
        });
    }
});

// ==========================
// ➕ CREATE INVOICE
// ==========================
router.post('/', protect, async(req, res) => {
    try {
        const user = req.user;

        if (!user || !user._id) {
            return res.status(401).json({
                message: 'Unauthorized'
            });
        }

        const count = await Invoice.countDocuments({
            user: user._id
        });

        if (
            user.plan === 'free' &&
            count >= FREE_PLAN_LIMIT
        ) {
            return res.status(403).json({
                message: 'Free plan limit reached',
                limitReached: true
            });
        }

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
            logo,
            items,
            gst,
            cgst,
            sgst,
            upiId
        } = req.body;

        console.log('📥 INCOMING DATA:', req.body);

        if (!clientName || !clientEmail || !amount) {
            return res.status(400).json({
                message: 'Missing required fields'
            });
        }

        const invoice = await Invoice.create({
            clientName,
            clientEmail,
            serviceDescription,
            amount: Number(amount),
            currency: currency || 'INR',
            date: date ||
                new Date().toISOString().split('T')[0],
            dueDate: dueDate || '',
            notes,
            logo: logo || null,
            items: items || [],
            gst: gst || '',
            cgst: Number(cgst) || 0,
            sgst: Number(sgst) || 0,
            upiId: upiId || '',
            invoiceNumber,
            user: user._id
        });

        console.log('✅ Invoice created:', invoice._id);

        // SAFE EMAIL
        try {
            await sendEmail(
                clientEmail,
                'Invoice from InvoicePro',
                `
          <h2>You received a new invoice</h2>
          <p><strong>Amount:</strong> ₹${amount}</p>
          <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
        `
            );
        } catch (e) {
            console.log(
                '📧 Email failed but invoice saved'
            );
        }

        res.status(201).json({ invoice });

    } catch (err) {
        console.error(
            '🔥 CREATE INVOICE ERROR:',
            err
        );

        res.status(500).json({
            message: 'Server error'
        });
    }
});

// ==========================
// 🔄 UPDATE STATUS
// ==========================
router.put('/:id/status', protect, async(req, res) => {
    try {
        const invoice =
            await Invoice.findOneAndUpdate({
                _id: req.params.id,
                user: req.user._id
            }, {
                status: req.body.status
            }, {
                new: true
            });

        if (!invoice) {
            return res.status(404).json({
                message: 'Invoice not found.'
            });
        }

        res.json({
            message: 'Status updated!',
            invoice
        });

    } catch (err) {
        console.error(
            '🔥 UPDATE STATUS ERROR:',
            err
        );

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

// ==========================
// ❌ DELETE INVOICE
// ==========================
router.delete('/:id', protect, async(req, res) => {
    try {
        const invoice =
            await Invoice.findOneAndDelete({
                _id: req.params.id,
                user: req.user._id
            });

        if (!invoice) {
            return res.status(404).json({
                message: 'Invoice not found.'
            });
        }

        res.json({
            message: 'Invoice deleted.'
        });

    } catch (err) {
        console.error('🔥 DELETE ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

module.exports = router;