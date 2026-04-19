const express = require('express');
const Invoice = require('../models/Invoice');
const { protect } = require('../middleware/auth');

const router = express.Router();
const sendEmail = require('../utils/sendEmail');

const FREE_PLAN_LIMIT = 2;

// Generate invoice number
const generateInvoiceNumber = (count) => {
    const num = String(count + 1).padStart(4, '0');
    return `INV-${num}`;
};

// ==========================
// GET ALL INVOICES
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
        console.error('GET INVOICES ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

// ==========================
// PUBLIC INVOICE VIEW
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
        console.error('PUBLIC INVOICE ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

// ==========================
// GET SINGLE INVOICE
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
        console.error('GET SINGLE ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

// ==========================
// CREATE INVOICE
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

        if (user.plan === 'free' && count >= FREE_PLAN_LIMIT) {
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

        if (!clientName || !clientEmail || !amount) {
            return res.status(400).json({
                message: 'Missing required fields'
            });
        }

        const invoice = await Invoice.create({
            clientName,
            clientEmail,
            serviceDescription: serviceDescription || '',
            amount: Number(amount),
            currency: currency || 'INR',
            date: date || new Date(),
            dueDate: dueDate || null,
            notes: notes || '',
            logo: logo || null,
            items: items || [],
            gst: gst || '',
            cgst: Number(cgst) || 0,
            sgst: Number(sgst) || 0,
            upiId: upiId || '',
            invoiceNumber,
            user: user._id,

            // ✅ FIXED STATUS SYSTEM
            status: 'pending',
            paidAt: null
        });

        console.log('Invoice created:', invoice._id);

        res.status(201).json({ invoice });

        // Send email in background
        setImmediate(async() => {
            try {
                const publicInvoiceLink =
                    `${process.env.FRONTEND_URL}/public/invoice/${invoice._id}`;

                const dueText = dueDate ?
                    new Date(dueDate).toLocaleDateString('en-IN') :
                    'Not specified';

                await sendEmail(
                    clientEmail,
                    `Invoice ${invoiceNumber} from InvoicePro`,
                    `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;">
            <h2 style="margin-bottom:8px;color:#111827;">
              New Invoice from InvoicePro
            </h2>

            <p style="color:#6b7280;margin-bottom:24px;">
              Hi ${clientName},<br/>
              You have received a new invoice.
            </p>

            <div style="background:#f9fafb;padding:20px;border-radius:12px;margin-bottom:24px;">
              <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
              <p><strong>Total Amount:</strong> ₹${Number(amount).toLocaleString('en-IN')}</p>
              <p><strong>Due Date:</strong> ${dueText}</p>
            </div>

            <a href="${publicInvoiceLink}"
              style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:bold;">
              View Invoice
            </a>

            <p style="margin-top:32px;color:#9ca3af;font-size:14px;">
              Thank you for using InvoicePro.
            </p>
          </div>
          `
                );

            } catch (e) {
                console.log('Email failed in background');
            }
        });

    } catch (err) {
        console.error('CREATE INVOICE ERROR:', err);

        res.status(500).json({
            message: err.message || 'Server error'
        });
    }
});

// ==========================
// UPDATE STATUS (FIXED)
// ==========================
router.put('/:id/status', protect, async(req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                message: 'Invoice not found.'
            });
        }

        if (invoice.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: 'Unauthorized action'
            });
        }

        const { status } = req.body;

        if (!['pending', 'paid'].includes(status)) {
            return res.status(400).json({
                message: 'Invalid status'
            });
        }

        invoice.status = status;

        if (status === 'paid') {
            invoice.paidAt = new Date();
        }

        await invoice.save();

        res.json({
            message: 'Status updated!',
            invoice
        });

    } catch (err) {
        console.error('UPDATE STATUS ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

// ==========================
// DELETE INVOICE
// ==========================
router.delete('/:id', protect, async(req, res) => {
    try {
        const invoice = await Invoice.findOneAndDelete({
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
        console.error('DELETE ERROR:', err);

        res.status(500).json({
            message: 'Server error.'
        });
    }
});

module.exports = router;