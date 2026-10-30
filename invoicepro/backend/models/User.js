const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },

    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },

    phone: {
        type: String,
        trim: true,
        default: '',
        index: true
    },

    welcomeMessageSent: {
        type: Boolean,
        default: false
    },

    welcomeMessageSentAt: {
        type: Date,
        default: null
    },

    welcomeEmailSent: {
        type: Boolean,
        default: false
    },

    welcomeEmailSentAt: {
        type: Date,
        default: null
    },

    password: {
        type: String,
        required: function() {
            // Password is required only if they haven't connected Google or GitHub
            return !this.googleId && !this.github?.connected;
        },
        minlength: 8
    },

    // 🔥 UPDATED PLAN SYSTEM
    plan: {
        type: String,
        enum: ['free', 'pro', 'monthly', 'yearly', 'founder90', 'trial', 'early_access'],
        default: 'free'
    },

    // 🔥 OPTIONAL (future use)
    planExpiresAt: {
        type: Date,
        default: null
    },

    subscriptionProvider: {
        type: String,
        default: ''
    },

    subscriptionStatus: {
        type: String,
        default: ''
    },

    razorpaySubscriptionId: {
        type: String,
        default: ''
    },

    planStartedAt: {
        type: Date,
        default: null
    },

    lastPaymentAt: {
        type: Date,
        default: null
    },

    trialStartedAt: {
        type: Date,
        default: null
    },

    trialUsedAt: {
        type: Date,
        default: null
    },

    earlyAccessStartedAt: {
        type: Date,
        default: null
    },

    earlyAccessUsedAt: {
        type: Date,
        default: null
    },

    freeAccessStartedAt: {
        type: Date,
        default: null
    },

    isDemo: {
        type: Boolean,
        default: false
    },

    freeAccessExpiresAt: {
        type: Date,
        default: null
    },

    persona: {
        type: String,
        enum: ['', 'freelancer', 'agency', 'small_business', 'student', 'other'],
        default: ''
    },

    freelanceExperience: {
        type: String,
        enum: ['', 'beginner', '1_to_3_years', '3_to_5_years', '5_plus_years'],
        default: ''
    },

    onboardingCompleted: {
        type: Boolean,
        default: false
    },

    onboardingCompletedAt: {
        type: Date,
        default: null
    },

    companyName: {
        type: String,
        default: ''
    },

    gstNumber: {
        type: String,
        default: ''
    },

    upiId: {
        type: String,
        default: ''
    },

    address: {
        type: String,
        default: 'Tamil Nadu, India'
    },

    logo: {
        type: String,
        default: ''
    },
    github: {
        connected: {
            type: Boolean,
            default: false
        },
        username: {
            type: String,
            default: '',
            trim: true
        },
        name: {
            type: String,
            default: '',
            trim: true
        },
        avatarUrl: {
            type: String,
            default: '',
            trim: true
        },
        htmlUrl: {
            type: String,
            default: '',
            trim: true
        },
        tokenEncrypted: {
            type: String,
            default: ''
        },
        tokenIv: {
            type: String,
            default: ''
        },
        tokenAuthTag: {
            type: String,
            default: ''
        },
        connectedAt: {
            type: Date,
            default: null
        },
        lastVerifiedAt: {
            type: Date,
            default: null
        }
    },
    enterpriseOrganization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null,
        index: true
    },
    enterpriseRole: {
        type: String,
        enum: ['', 'owner', 'admin', 'billing', 'security', 'member', 'viewer'],
        default: ''
    },
    enterpriseJoinedAt: {
        type: Date,
        default: null
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}, {
    timestamps: true
});

// ==========================
// HASH PASSWORD
// ==========================
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }

    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// ==========================
// COMPARE PASSWORD
// ==========================
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
