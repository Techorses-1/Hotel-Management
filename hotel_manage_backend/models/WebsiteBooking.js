// models/WebsiteBooking.js - UPDATED (NO next())
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const websiteBookingSchema = new mongoose.Schema({
    bookingId: {
        type: String,
        unique: true,
        default: () => uuidv4(),
    },
    bookingNumber: {
        type: String,
        unique: true,
        // NOT required - will be generated automatically
    },

    // Customer Details
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },

    // Status
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
        default: 'Pending'
    },

    // Admin Notes
    adminNotes: {
        type: String,
        default: '',
        trim: true
    },

    // Timestamps for filtering
    bookingDate: {
        type: Date,
        default: Date.now
    },
    bookingTime: {
        type: String,
        default: () => new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    },

    // Audit
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

// Generate booking number before save - NO next()
websiteBookingSchema.pre('save', function() {
    if (!this.bookingNumber) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.bookingNumber = `WB-${year}${month}${day}-${random}`;
    }
    this.updatedAt = new Date();
});

// Indexes for optimized queries
websiteBookingSchema.index({ bookingNumber: 1 });
websiteBookingSchema.index({ phone: 1 });
websiteBookingSchema.index({ email: 1 });
websiteBookingSchema.index({ status: 1 });
websiteBookingSchema.index({ bookingDate: -1 });
websiteBookingSchema.index({ createdAt: -1 });

const WebsiteBooking = mongoose.model('WebsiteBooking', websiteBookingSchema);
module.exports = WebsiteBooking;