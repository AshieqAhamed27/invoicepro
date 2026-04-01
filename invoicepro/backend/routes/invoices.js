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
router.get('/', protect, async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ invoices, count: invoices.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/invoices/:id — get single invoice
router.get('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user._id });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    res.json({ invoice });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/invoices — create invoice
router.post('/', protect, async (req, res) => {
  try {
    const { clientName, clientEmail, serviceDescription, amount, currency, date, dueDate, notes } = req.body;

    if (!clientName || !clientEmail || !serviceDescription || !amount || !date) {
      return res.status(400).json({ message: 'Please fill all required fields.' });
    }

    // Check plan limit
    const invoiceCount = await Invoice.countDocuments({ user: req.user._id });
    if (req.user.plan === 'free' && invoiceCount >= FREE_PLAN_LIMIT) {
      return res.status(403).json({
        message: 'Free plan limit reached. Upgrade to Pro to create unlimited invoices.',
        limitReached: true
      });
    }

    const invoice = await Invoice.create({
      user: req.user._id,
      invoiceNumber: generateInvoiceNumber(invoiceCount),
      clientName,
      clientEmail,
      serviceDescription,
      amount,
      currency: currency || 'INR',
      date,
      dueDate,
      notes
    });

    res.status(201).json({ message: 'Invoice created!', invoice });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/invoices/:id/status — update invoice status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { status: req.body.status },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    res.json({ message: 'Status updated!', invoice });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    res.json({ message: 'Invoice deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
