const mongoose = require('mongoose');

const ORG_ROLES = ['owner', 'admin', 'billing', 'security', 'member', 'viewer'];

const orgMemberSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    name: {
        type: String,
        default: '',
        trim: true,
        maxlength: 120
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        maxlength: 160
    },
    role: {
        type: String,
        enum: ORG_ROLES,
        default: 'member'
    },
    status: {
        type: String,
        enum: ['active', 'invited', 'disabled'],
        default: 'active'
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    invitedAt: {
        type: Date,
        default: null
    },
    disabledAt: {
        type: Date,
        default: null
    }
}, { _id: true });

const orgAuditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    label: {
        type: String,
        default: '',
        trim: true,
        maxlength: 180
    },
    targetType: {
        type: String,
        default: '',
        trim: true,
        maxlength: 80
    },
    targetId: {
        type: String,
        default: '',
        trim: true,
        maxlength: 100
    },
    actor: {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        name: {
            type: String,
            default: '',
            trim: true,
            maxlength: 120
        },
        email: {
            type: String,
            default: '',
            lowercase: true,
            trim: true,
            maxlength: 160
        },
        role: {
            type: String,
            default: '',
            trim: true,
            maxlength: 40
        }
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 140
    },
    slug: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        maxlength: 160,
        unique: true
    },
    domain: {
        type: String,
        default: '',
        lowercase: true,
        trim: true,
        maxlength: 160
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    members: [orgMemberSchema],
    billing: {
        currency: {
            type: String,
            enum: ['INR', 'USD'],
            default: 'INR'
        },
        cycle: {
            type: String,
            enum: ['monthly', 'yearly'],
            default: 'monthly'
        },
        seatPriceInr: {
            type: Number,
            default: 299,
            min: 0
        },
        seatPriceUsd: {
            type: Number,
            default: 5,
            min: 0
        },
        includedSeats: {
            type: Number,
            default: 1,
            min: 1
        },
        status: {
            type: String,
            enum: ['preview', 'active', 'past_due', 'cancelled'],
            default: 'preview'
        },
        provider: {
            type: String,
            default: 'razorpay'
        },
        providerCustomerId: {
            type: String,
            default: '',
            trim: true
        },
        providerSubscriptionId: {
            type: String,
            default: '',
            trim: true
        },
        providerOrderId: {
            type: String,
            default: '',
            trim: true
        },
        providerPaymentId: {
            type: String,
            default: '',
            trim: true
        },
        activatedAt: {
            type: Date,
            default: null
        },
        currentPeriodStart: {
            type: Date,
            default: null
        },
        currentPeriodEnd: {
            type: Date,
            default: null
        },
        lastCalculatedAt: {
            type: Date,
            default: null
        }
    },
    security: {
        invitePolicy: {
            type: String,
            enum: ['owners_admins', 'managers', 'any_member'],
            default: 'owners_admins'
        },
        paymentPolicy: {
            type: String,
            enum: ['owners_billing', 'admins_billing', 'owner_only'],
            default: 'owners_billing'
        },
        clientVisibility: {
            type: String,
            enum: ['all_members', 'delivery_finance_admin', 'owner_admin_only'],
            default: 'delivery_finance_admin'
        },
        requireSso: {
            type: Boolean,
            default: false
        },
        enforceAllowedDomains: {
            type: Boolean,
            default: false
        }
    },
    sso: {
        enabled: {
            type: Boolean,
            default: false
        },
        provider: {
            type: String,
            enum: ['', 'google_workspace', 'microsoft_entra'],
            default: ''
        },
        allowedDomains: [{
            type: String,
            lowercase: true,
            trim: true,
            maxlength: 160
        }],
        tenantId: {
            type: String,
            default: '',
            trim: true,
            maxlength: 160
        },
        lastVerifiedAt: {
            type: Date,
            default: null
        }
    },
    retention: {
        auditLogRetentionDays: {
            type: Number,
            default: 365,
            min: 30,
            max: 2555
        },
        dataRetentionDays: {
            type: Number,
            default: 1095,
            min: 90,
            max: 3650
        },
        backupFrequency: {
            type: String,
            enum: ['manual', 'weekly', 'monthly'],
            default: 'manual'
        },
        backupEnabled: {
            type: Boolean,
            default: true
        },
        lastBackupAt: {
            type: Date,
            default: null
        },
        nextReviewAt: {
            type: Date,
            default: null
        }
    },
    auditLogs: [orgAuditLogSchema]
}, {
    timestamps: true
});

organizationSchema.index({ owner: 1, createdAt: -1 });
organizationSchema.index({ 'members.user': 1 });
organizationSchema.index({ 'members.email': 1 });
organizationSchema.index({ 'sso.allowedDomains': 1 });
organizationSchema.index({ 'auditLogs.createdAt': -1 });

module.exports = mongoose.model('Organization', organizationSchema);
module.exports.ORG_ROLES = ORG_ROLES;
