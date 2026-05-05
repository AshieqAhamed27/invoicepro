const express = require('express');
const Client = require('../models/Client');
const { protect } = require('../middleware/auth');
const { isValidObjectId, rejectInvalidObjectId } = require('../utils/objectId');

const router = express.Router();

// Get all clients
router.get('/', protect, async(req, res) => {
    try {
        const clients = await Client.find({
            user: req.user._id
        }).sort({ name: 1 });
        res.json(clients);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create client
router.post('/', protect, async(req, res) => {
    try {
        const { name, email, phone, companyName, address, gst } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        const client = await Client.create({
            user: req.user._id,
            name,
            email,
            phone,
            companyName,
            address,
            gst
        });

        res.status(201).json(client);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete client
router.delete('/:id', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'client');
        }

        const client = await Client.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        res.json({ message: 'Client deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
