const express = require('express');
const Lead = require('../models/Lead');
const Client = require('../models/Client');
const { protect } = require('../middleware/auth');
const { isValidObjectId, rejectInvalidObjectId } = require('../utils/objectId');

const router = express.Router();

const LEAD_STATUSES = ['new', 'contacted', 'interested', 'proposal_sent', 'won', 'lost'];
const UPDATABLE_FIELDS = [
    'businessName',
    'contactName',
    'email',
    'phone',
    'website',
    'linkedinUrl',
    'instagramUrl',
    'niche',
    'pain',
    'budget',
    'urgency',
    'status',
    'fitScore',
    'fitLabel',
    'notes',
    'source',
    'nextFollowUpAt',
    'lastContactedAt'
];

const cleanString = (value) => String(value || '').trim();

const normalizeUrl = (value) => cleanString(value);

const normalizeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeNumber = (value) => {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const normalizeLeadPayload = (body = {}) => {
    const status = LEAD_STATUSES.includes(body.status) ? body.status : undefined;
    const urgency = ['low', 'normal', 'high'].includes(body.urgency) ? body.urgency : undefined;

    return {
        businessName: cleanString(body.businessName),
        contactName: cleanString(body.contactName),
        email: cleanString(body.email).toLowerCase(),
        phone: cleanString(body.phone),
        website: normalizeUrl(body.website),
        linkedinUrl: normalizeUrl(body.linkedinUrl),
        instagramUrl: normalizeUrl(body.instagramUrl),
        niche: cleanString(body.niche),
        pain: cleanString(body.pain),
        budget: normalizeNumber(body.budget),
        urgency,
        status,
        fitScore: Math.max(0, Math.min(100, normalizeNumber(body.fitScore))),
        fitLabel: cleanString(body.fitLabel),
        notes: cleanString(body.notes),
        source: cleanString(body.source) || 'manual',
        nextFollowUpAt: normalizeDate(body.nextFollowUpAt),
        lastContactedAt: normalizeDate(body.lastContactedAt)
    };
};

const stripUndefined = (value = {}) =>
    Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));

const buildStats = (leads = []) => {
    const stats = LEAD_STATUSES.reduce((acc, status) => {
        acc[status] = 0;
        return acc;
    }, {});

    let followUpsDue = 0;
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    leads.forEach((lead) => {
        stats[lead.status] = (stats[lead.status] || 0) + 1;

        if (
            lead.nextFollowUpAt &&
            !['won', 'lost'].includes(lead.status) &&
            new Date(lead.nextFollowUpAt) <= todayEnd
        ) {
            followUpsDue += 1;
        }
    });

    return {
        ...stats,
        total: leads.length,
        followUpsDue
    };
};

router.get('/', protect, async(req, res) => {
    try {
        const query = { user: req.user._id };

        if (LEAD_STATUSES.includes(req.query.status)) {
            query.status = req.query.status;
        }

        const leads = await Lead.find(query)
            .sort({ nextFollowUpAt: 1, updatedAt: -1 })
            .lean();

        res.json({
            leads,
            stats: buildStats(leads)
        });
    } catch (err) {
        console.error('GET LEADS ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/', protect, async(req, res) => {
    try {
        const payload = stripUndefined(normalizeLeadPayload(req.body));

        if (!payload.businessName && !payload.email && !payload.phone && !payload.website) {
            return res.status(400).json({
                message: 'Add business name, email, phone, or website before saving a lead.'
            });
        }

        const lead = await Lead.create({
            ...payload,
            user: req.user._id,
            status: payload.status || 'new',
            urgency: payload.urgency || 'normal',
            fitLabel: payload.fitLabel || 'New lead'
        });

        res.status(201).json({ lead });
    } catch (err) {
        console.error('CREATE LEAD ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.patch('/:id', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'lead');
        }

        const normalized = normalizeLeadPayload(req.body);
        const updates = {};

        UPDATABLE_FIELDS.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updates[field] = normalized[field];
            }
        });

        if (Object.prototype.hasOwnProperty.call(req.body, 'status') && !LEAD_STATUSES.includes(req.body.status)) {
            return res.status(400).json({ message: 'Invalid lead status.' });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'urgency') && !['low', 'normal', 'high'].includes(req.body.urgency)) {
            return res.status(400).json({ message: 'Invalid lead urgency.' });
        }

        const lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            stripUndefined(updates),
            { new: true, runValidators: true }
        );

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found.' });
        }

        res.json({ lead });
    } catch (err) {
        console.error('UPDATE LEAD ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/convert-client', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'lead');
        }

        const lead = await Lead.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found.' });
        }

        const clientName = cleanString(req.body.name) || lead.contactName || lead.businessName;
        const clientEmail = cleanString(req.body.email) || lead.email;

        if (!clientName || !clientEmail) {
            return res.status(400).json({
                message: 'Client name and email are required to convert a lead.'
            });
        }

        let client = await Client.findOne({
            user: req.user._id,
            email: clientEmail.toLowerCase()
        });

        if (!client) {
            client = await Client.create({
                user: req.user._id,
                name: clientName,
                email: clientEmail,
                companyName: lead.businessName || clientName,
                address: '',
                gst: ''
            });
        }

        lead.status = 'won';
        lead.convertedClientId = client._id;
        await lead.save();

        res.json({
            message: 'Lead converted to client.',
            lead,
            client
        });
    } catch (err) {
        console.error('CONVERT LEAD ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.delete('/:id', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'lead');
        }

        const lead = await Lead.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found.' });
        }

        res.json({ message: 'Lead deleted.' });
    } catch (err) {
        console.error('DELETE LEAD ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router;
