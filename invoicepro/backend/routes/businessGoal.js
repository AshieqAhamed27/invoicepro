const express = require('express');
const BusinessGoal = require('../models/BusinessGoal');
const { protect } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_GOAL = {
    target: 50000,
    averageDeal: 12500,
    closeRate: 25,
    proposalRate: 35,
    hoursPerWeek: 20,
    service: 'Website, design, or business service package'
};

const clampNumber = (value, fallback, min, max) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return Math.max(min, Math.min(max, Math.round(number)));
};

const cleanService = (value) => {
    const service = String(value || '').trim();
    return service ? service.slice(0, 140) : DEFAULT_GOAL.service;
};

const sanitizeGoal = (body = {}) => ({
    target: clampNumber(body.target, DEFAULT_GOAL.target, 1000, 100000000),
    averageDeal: clampNumber(body.averageDeal, DEFAULT_GOAL.averageDeal, 500, 10000000),
    closeRate: clampNumber(body.closeRate, DEFAULT_GOAL.closeRate, 5, 100),
    proposalRate: clampNumber(body.proposalRate, DEFAULT_GOAL.proposalRate, 5, 100),
    hoursPerWeek: clampNumber(body.hoursPerWeek, DEFAULT_GOAL.hoursPerWeek, 1, 80),
    service: cleanService(body.service)
});

const serializeGoal = (goal) => ({
    target: goal.target,
    averageDeal: goal.averageDeal,
    closeRate: goal.closeRate,
    proposalRate: goal.proposalRate,
    hoursPerWeek: goal.hoursPerWeek,
    service: goal.service,
    updatedAt: goal.updatedAt
});

router.get('/', protect, async(req, res) => {
    try {
        const goal = await BusinessGoal.findOne({ user: req.user._id });

        if (!goal) {
            return res.json({
                goal: DEFAULT_GOAL,
                source: 'default'
            });
        }

        res.json({
            goal: serializeGoal(goal),
            source: 'database'
        });
    } catch (err) {
        console.error('BUSINESS GOAL LOAD ERROR:', err.message);
        res.status(500).json({ message: 'Could not load income goal' });
    }
});

router.put('/', protect, async(req, res) => {
    try {
        const payload = sanitizeGoal(req.body);
        const goal = await BusinessGoal.findOneAndUpdate(
            { user: req.user._id },
            {
                $set: {
                    ...payload,
                    user: req.user._id
                }
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        res.json({
            goal: serializeGoal(goal),
            message: 'Income goal saved'
        });
    } catch (err) {
        console.error('BUSINESS GOAL SAVE ERROR:', err.message);
        res.status(500).json({ message: 'Could not save income goal' });
    }
});

module.exports = router;
