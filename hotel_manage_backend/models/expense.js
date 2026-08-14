const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ============================================
// DOCUMENT SUB-SCHEMA
// ============================================
const documentSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    fileType: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

// ============================================
// MAIN EXPENSE SCHEMA
// ============================================
const expenseSchema = new mongoose.Schema({
    expenseId: {
        type: String,
        unique: true,
        default: () => uuidv4(),
    },
    expenseNumber: {
        type: String,
        unique: true,  // ✅ This already creates an index
        // Auto-generated in pre-save
        // ❌ No index: true needed - unique: true handles it
    },

    // ===== EXPENSE DETAILS =====
    date: {
        type: Date,
        required: [true, 'Date is required']
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: 0
    },

    // ===== PAYMENT DETAILS =====
    paymentMode: {
        type: String,
        required: [true, 'Payment mode is required'],
        enum: ['Cash', 'Bank', 'Cheque', 'UPI'],
        default: 'Cash'
    },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Unpaid', 'Partial'],
        default: 'Paid'
    },

    // ===== DOCUMENT =====
    document: documentSchema,

    // ===== AUDIT =====
    createdBy: {
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        userEmail: { type: String, required: true }
    },
    updatedBy: {
        userId: { type: String },
        userName: { type: String },
        userEmail: { type: String }
    }
}, {
    timestamps: true
});

// ============================================
// INDEXES
// ============================================
// ❌ REMOVED: expenseSchema.index({ expenseNumber: 1 }); // Duplicate - unique: true already creates index
expenseSchema.index({ date: 1 });
expenseSchema.index({ title: 1 });
expenseSchema.index({ paymentMode: 1 });
expenseSchema.index({ paymentStatus: 1 });
expenseSchema.index({ createdAt: -1 });

// ============================================
// VIRTUAL: Formatted Amount
// ============================================
expenseSchema.virtual('formattedAmount').get(function () {
    return '₹' + this.amount.toLocaleString('en-IN');
});

// ============================================
// VIRTUAL: Formatted Date
// ============================================
expenseSchema.virtual('formattedDate').get(function () {
    return this.date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
});

// ============================================
// PRE-SAVE: Generate expense number - NO next()
// ============================================
expenseSchema.pre('save', async function () {
    // ✅ Only generate if expenseNumber is not already set
    if (!this.expenseNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const prefix = `EX-${year}${month}${day}`;

        const lastExpense = await this.constructor.findOne({
            expenseNumber: { $regex: `^${prefix}` }
        }).sort({ expenseNumber: -1 });

        let sequence = 1;
        if (lastExpense) {
            const lastSeq = parseInt(lastExpense.expenseNumber.split('-')[2]);
            sequence = lastSeq + 1;
        }

        this.expenseNumber = `${prefix}-${String(sequence).padStart(4, '0')}`;
    }
});

// ============================================
// TOJSON
// ============================================
expenseSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.__v;
        return ret;
    }
});

const Expense = mongoose.model('Expense', expenseSchema);
module.exports = Expense;