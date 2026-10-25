const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    name: {
        type: String,
        trim: true,
        default: 'ClientFlow User'
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 5
    },
    category: {
        type: String,
        default: 'Review'
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    postedToGoogle: {
        type: Boolean,
        default: false
    },
    source: {
        type: String,
        default: 'in_app_modal'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Feedback', feedbackSchema);
