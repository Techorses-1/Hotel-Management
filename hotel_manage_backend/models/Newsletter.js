// models/Newsletter.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const newsletterSchema = new mongoose.Schema({
    subscriptionId: {
        type: String,
        unique: true,
        default: () => uuidv4(),
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    subscribedAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ isActive: 1 });
newsletterSchema.index({ subscribedAt: -1 });

const Newsletter = mongoose.model('Newsletter', newsletterSchema);
module.exports = Newsletter;