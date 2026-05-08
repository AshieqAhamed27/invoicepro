const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    focus: {
        type: String,
        default: '',
        trim: true
    },
    lead: {
        type: String,
        default: '',
        trim: true
    },
    status: {
        type: String,
        enum: ['planning', 'active', 'review', 'completed', 'paused'],
        default: 'planning'
    }
}, { _id: true });

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
    groupName: {
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
    groupName: {
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

const resourceSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['repository', 'preview', 'design', 'document', 'other'],
        default: 'other'
    },
    url: {
        type: String,
        required: true,
        trim: true
    },
    notes: {
        type: String,
        default: '',
        trim: true
    },
    addedBy: {
        type: String,
        default: '',
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const maintenanceIssueSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['bug', 'feature', 'task', 'client_request'],
        default: 'task'
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'review', 'done'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high'],
        default: 'normal'
    },
    owner: {
        type: String,
        default: '',
        trim: true
    },
    groupName: {
        type: String,
        default: '',
        trim: true
    },
    dueDate: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        default: '',
        trim: true
    },
    createdBy: {
        type: String,
        default: '',
        trim: true
    }
}, {
    _id: true,
    timestamps: true
});

const releaseSchema = new mongoose.Schema({
    version: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['planned', 'in_progress', 'shipped'],
        default: 'planned'
    },
    targetDate: {
        type: Date,
        default: null
    },
    summary: {
        type: String,
        default: '',
        trim: true
    },
    createdBy: {
        type: String,
        default: '',
        trim: true
    }
}, {
    _id: true,
    timestamps: true
});

const wikiPageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['setup', 'client', 'delivery', 'qa', 'handover', 'other'],
        default: 'other'
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    updatedBy: {
        type: String,
        default: '',
        trim: true
    }
}, {
    _id: true,
    timestamps: true
});

const codeEnvironmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    os: {
        type: String,
        enum: ['linux', 'windows', 'macos', 'android', 'ios', 'server', 'other'],
        default: 'linux'
    },
    runtime: {
        type: String,
        default: '',
        trim: true
    },
    repositoryUrl: {
        type: String,
        default: '',
        trim: true
    },
    branch: {
        type: String,
        default: '',
        trim: true
    },
    setupCommands: [String],
    runCommands: [String],
    testCommands: [String],
    notes: {
        type: String,
        default: '',
        trim: true
    },
    owner: {
        type: String,
        default: '',
        trim: true
    },
    groupName: {
        type: String,
        default: '',
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const codeSnippetSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    filePath: {
        type: String,
        default: '',
        trim: true
    },
    language: {
        type: String,
        default: 'text',
        trim: true
    },
    code: {
        type: String,
        required: true
    },
    notes: {
        type: String,
        default: '',
        trim: true
    },
    owner: {
        type: String,
        default: '',
        trim: true
    },
    groupName: {
        type: String,
        default: '',
        trim: true
    },
    status: {
        type: String,
        enum: ['draft', 'review', 'approved'],
        default: 'draft'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const codeRunSchema = new mongoose.Schema({
    snippetId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    title: {
        type: String,
        default: '',
        trim: true
    },
    language: {
        type: String,
        default: '',
        trim: true
    },
    image: {
        type: String,
        default: '',
        trim: true
    },
    status: {
        type: String,
        enum: ['completed', 'failed', 'timeout', 'error'],
        default: 'completed'
    },
    stdout: {
        type: String,
        default: ''
    },
    stderr: {
        type: String,
        default: ''
    },
    exitCode: {
        type: Number,
        default: null
    },
    durationMs: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: String,
        default: '',
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const messageSchema = new mongoose.Schema({
    groupName: {
        type: String,
        default: '',
        trim: true
    },
    senderName: {
        type: String,
        default: '',
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const memberSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    name: {
        type: String,
        default: '',
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
        enum: ['owner', 'editor', 'viewer'],
        default: 'viewer'
    },
    groupName: {
        type: String,
        default: '',
        trim: true
    },
    status: {
        type: String,
        enum: ['invited', 'active', 'removed'],
        default: 'active'
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const inviteSchema = new mongoose.Schema({
    tokenHash: {
        type: String,
        required: true,
        index: true
    },
    email: {
        type: String,
        default: '',
        lowercase: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['editor', 'viewer'],
        default: 'viewer'
    },
    groupName: {
        type: String,
        default: '',
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    acceptedAt: {
        type: Date,
        default: null
    },
    acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    revokedAt: {
        type: Date,
        default: null
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
    groups: [groupSchema],
    collaborators: [collaboratorSchema],
    tasks: [taskSchema],
    resources: [resourceSchema],
    maintenanceIssues: [maintenanceIssueSchema],
    releases: [releaseSchema],
    wikiPages: [wikiPageSchema],
    codeEnvironments: [codeEnvironmentSchema],
    codeSnippets: [codeSnippetSchema],
    codeRuns: [codeRunSchema],
    messages: [messageSchema],
    members: [memberSchema],
    inviteTokens: [inviteSchema],
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
        groupPlan: [{
            name: {
                type: String,
                default: ''
            },
            focus: {
                type: String,
                default: ''
            },
            nextAction: {
                type: String,
                default: ''
            },
            risk: {
                type: String,
                enum: ['low', 'medium', 'high'],
                default: 'medium'
            }
        }],
        risks: [String],
        generatedAt: {
            type: Date,
            default: null
        }
    },
    developerAgent: {
        summary: {
            type: String,
            default: ''
        },
        nextSteps: [String],
        codeChecklist: [String],
        outputChecklist: [String],
        blockers: [String],
        generatedAt: {
            type: Date,
            default: null
        }
    },
    maintenanceAgent: {
        summary: {
            type: String,
            default: ''
        },
        healthScore: {
            type: Number,
            default: 75,
            min: 0,
            max: 100
        },
        nextAction: {
            type: String,
            default: ''
        },
        releaseChecklist: [String],
        riskNotes: [String],
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
teamProjectSchema.index({ 'members.user': 1, updatedAt: -1 });
teamProjectSchema.index({ 'inviteTokens.tokenHash': 1 });

module.exports = mongoose.model('TeamProject', teamProjectSchema);
