const mongoose = require('mongoose');

const businessGoalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    target: {
        type: Number,
        default: 50000,
        min: 1000
    },
    averageDeal: {
        type: Number,
        default: 12500,
        min: 500
    },
    closeRate: {
        type: Number,
        default: 25,
        min: 5,
        max: 100
    },
    proposalRate: {
        type: Number,
        default: 35,
        min: 5,
        max: 100
    },
    hoursPerWeek: {
        type: Number,
        default: 20,
        min: 1,
        max: 80
    },
    service: {
        type: String,
        default: 'Website, design, or business service package',
        trim: true,
        maxlength: 140
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('BusinessGoal', businessGoalSchema);
