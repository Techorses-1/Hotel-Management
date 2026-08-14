const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const generateNumber = require("../utils/generateNumber"); // ✅ ADD THIS

// ============================================
// MAIN HOUSEKEEPING SCHEMA
// ============================================
const housekeepingSchema = new mongoose.Schema({
    taskId: {
        type: String,
        unique: true,
        default: () => uuidv4(),
    },
    taskNumber: {
        type: String,
        unique: true,
        // ✅ Auto-generated in pre-save
    },

    // ===== ROOM REFERENCE =====
    roomId: {
        type: String,
        required: true,
        index: true
    },
    roomNumber: {
        type: String,
        required: true
    },
    categoryId: {
        type: String,
        default: ''
    },
    categoryName: {
        type: String,
        default: ''
    },

    // ===== CHECK-OUT REFERENCE =====
    checkOutId: {
        type: String,
        required: false,
    },
    checkOutNumber: {
        type: String,
        required: false,
    },

    // ===== CUSTOMER REFERENCE =====
    customerId: {
        type: String,
        default: ''
    },
    customerName: {
        type: String,
        default: ''
    },
    customerPhone: {
        type: String,
        default: ''
    },

    // ===== STATUS =====
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Cancelled'],
        default: 'Pending',
        index: true
    },

    // ===== COMPLETION DETAILS =====
    completedAt: {
        type: Date,
        default: null
    },
    completedBy: {
        userId: { type: String },
        userName: { type: String },
        userEmail: { type: String }
    },

    // ===== NOTES =====
    note: {
        type: String,
        default: '',
        trim: true
    },

    // ===== AUDIT =====
    createdBy: {
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        userEmail: { type: String, required: true }
    }
}, {
    timestamps: true
});

// ============================================
// INDEXES
// ============================================
housekeepingSchema.index({ roomId: 1, status: 1 });
housekeepingSchema.index({ status: 1, createdAt: -1 });
housekeepingSchema.index({ createdAt: -1 });
housekeepingSchema.index({ completedAt: -1 });

// ============================================
// VIRTUAL: Is Completed
// ============================================
housekeepingSchema.virtual('isCompleted').get(function () {
    return this.status === 'Completed';
});

// ============================================
// VIRTUAL: Is Pending
// ============================================
housekeepingSchema.virtual('isPending').get(function () {
    return this.status === 'Pending';
});

// ============================================
// METHOD: Mark as Completed
// ============================================
housekeepingSchema.methods.markAsCompleted = function (user, note = '') {
    this.status = 'Completed';
    this.completedAt = new Date();
    this.completedBy = {
        userId: user.userId,
        userName: user.name,
        userEmail: user.email
    };
    if (note) {
        this.note = note;
    }
    return this.save();
};

// ============================================
// METHOD: Mark as Cancelled
// ============================================
housekeepingSchema.methods.markAsCancelled = function () {
    this.status = 'Cancelled';
    return this.save();
};

// ============================================
// STATIC: Get Pending Tasks
// ============================================
housekeepingSchema.statics.getPendingTasks = function () {
    return this.find({ status: 'Pending' })
        .sort({ createdAt: 1 })
        .lean();
};

// ============================================
// STATIC: Get Tasks by Room
// ============================================
housekeepingSchema.statics.getTasksByRoom = function (roomId) {
    return this.find({ roomId })
        .sort({ createdAt: -1 })
        .lean();
};

// ============================================
// PRE-SAVE: Generate task number - UPDATED ✅
// ============================================
housekeepingSchema.pre('save', async function () {
    // ✅ Only generate if taskNumber is not already set
    if (!this.taskNumber) {
        // ✅ Use global counter instead of date-based sequence
        this.taskNumber = await generateNumber('HK', 'housekeeping');
    }
});

// ============================================
// TOJSON
// ============================================
housekeepingSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.__v;
        return ret;
    }
});

const Housekeeping = mongoose.model('Housekeeping', housekeepingSchema);
module.exports = Housekeeping;