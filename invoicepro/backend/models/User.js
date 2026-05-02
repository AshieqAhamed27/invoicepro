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

    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6
    },

    // 🔥 UPDATED PLAN SYSTEM
    plan: {
        type: String,
        enum: ['free', 'pro', 'monthly', 'yearly', 'founder90', 'trial'],
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
