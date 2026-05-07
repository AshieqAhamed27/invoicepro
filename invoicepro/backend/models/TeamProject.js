const mongoose = require('mongoose');

const collaboratorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        default: '',
        lowercase: true,
        trim: true
    },
    role: {
        type: String,
        default: 'Contributor',
        trim: true
    },
    skill: {
        type: String,
        default: '',
        trim: true
    },
    availability: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    rate: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['invited', 'active', 'paused'],
        default: 'invited'
    }
}, { _id: true });

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    owner: {
        type: String,
        default: '',
        trim: true
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['todo', 'doing', 'done', 'blocked'],
        default: 'todo'
    },
    dueDate: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        default: '',
        trim: true
    }
}, { _id: true });

const teamProjectSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    clientName: {
        type: String,
        default: '',
        trim: true
    },
    budget: {
        type: Number,
        default: 0,
        min: 0
    },
    currency: {
        type: String,
        enum: ['INR', 'USD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD', 'CAD'],
        default: 'INR'
    },
    deadline: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['planning', 'active', 'review', 'completed', 'paused'],
        default: 'planning'
    },
    projectBrief: {
        type: String,
        default: '',
        trim: true
    },
    collaborators: [collaboratorSchema],
    tasks: [taskSchema],
    aiPlan: {
        summary: {
            type: String,
            default: ''
        },
        nextAction: {
            type: String,
            default: ''
        },
        riskLevel: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium'
        },
        roleSplit: [{
            name: {
                type: String,
                default: ''
            },
            role: {
                type: String,
                default: ''
            },
            focus: {
                type: String,
                default: ''
            }
        }],
        milestonePlan: [{
            title: {
                type: String,
                default: ''
            },
            owner: {
                type: String,
                default: ''
            },
            dueHint: {
                type: String,
                default: ''
            }
        }],
        risks: [String],
        generatedAt: {
            type: Date,
            default: null
        }
    }
}, {
    timestamps: true
});

teamProjectSchema.index({ user: 1, status: 1, updatedAt: -1 });
teamProjectSchema.index({ user: 1, deadline: 1 });

module.exports = mongoose.model('TeamProject', teamProjectSchema);
