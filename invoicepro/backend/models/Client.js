const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Client name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Client email is required'],
        lowercase: true,
        trim: true
    },
    companyName: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: ''
    },
    gst: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Client', clientSchema);
