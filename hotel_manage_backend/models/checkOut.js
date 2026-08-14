const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ============================================
// EXTRA CHARGE SUB-SCHEMA
// ============================================
const extraChargeSchema = new mongoose.Schema({
    chargeId: {
        type: String,
        default: () => uuidv4(),
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

// ============================================
// ROOM DETAIL SUB-SCHEMA (For Individual Room Pricing)
// ============================================
const checkoutRoomDetailSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true
    },
    roomNumber: {
        type: String,
        required: true
    },
    categoryId: {
        type: String,
        required: true
    },
    categoryName: {
        type: String,
        required: true
    },
    checkInDate: {
        type: Date,
        required: true
    },
    checkOutDate: {
        type: Date,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    totalHours: {
        type: Number,
        default: 0
    },
    totalDays: {
        type: Number,
        default: 0
    },
    remainingHours: {
        type: Number,
        default: 0
    },
    durationLabel: {
        type: String,
        default: ''
    },
    isRemoved: {
        type: Boolean,
        default: false
    },
    removedAt: {
        type: Date,
        default: null
    },
    hoursUsed: {
        type: Number,
        default: 0
    },
    reason: {
        type: String,
        default: ''
    }
});

// ============================================
// DISCOUNT SUB-SCHEMA
// ============================================
const discountSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },
    amount: {
        type: Number,
        default: 0,
        min: 0
    },
    reason: {
        type: String,
        default: '',
        trim: true
    },
    appliedBy: {
        userId: { type: String },
        userName: { type: String },
        userEmail: { type: String }
    }
});

// ============================================
// ID PROOF SUB-SCHEMA
// ============================================
const checkOutIdProofSchema = new mongoose.Schema({
    proofId: {
        type: String,
        default: () => uuidv4(),
    },
    label: {
        type: String,
        required: true,
        enum: ['Aadhar Card', 'Passport', 'Driving License', 'Voter ID', 'PAN Card', 'Other'],
        default: 'Other'
    },
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
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

// ============================================
// PAYMENT DETAIL SUB-SCHEMA
// ============================================
const paymentDetailSchema = new mongoose.Schema({
    paymentId: {
        type: String,
        default: () => uuidv4(),
    },
    method: {
        type: String,
        enum: ['Cash', 'UPI', 'Bank', 'Cheque'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    reference: {
        type: String,
        default: '',
        trim: true
    },
    paidAt: {
        type: Date,
        default: Date.now
    }
});

// ============================================
// LOYALTY POINTS SUB-SCHEMA
// ============================================
const loyaltyPointsSchema = new mongoose.Schema({
    pointsEarned: {
        type: Number,
        default: 0,
        min: 0
    },
    pointsUsed: {
        type: Number,
        default: 0,
        min: 0
    },
    totalPoints: {
        type: Number,
        default: 0,
        min: 0
    }
});

// ============================================
// MAIN CHECK-OUT SCHEMA
// ============================================
const checkOutSchema = new mongoose.Schema({
    checkOutId: {
        type: String,
        unique: true,
        default: () => uuidv4(),
    },
    checkOutNumber: {
        type: String,
        unique: true,
        required: true
    },

    // ============================================
    // ✅ NEW: BOOKING TYPE (simple / perNight)
    // ============================================
    bookingType: {
        type: String,
        enum: ['simple', 'perNight'],
        default: 'simple',
        required: true
    },

    checkInId: {
        type: String,
        required: true
    },
    checkInNumber: {
        type: String,
        required: true
    },

    customerId: {
        type: String,
        required: true
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true
    },
    customerEmail: {
        type: String,
        trim: true,
        lowercase: true
    },

    // Room details with individual pricing
    roomDetails: [checkoutRoomDetailSchema],

    // Active rooms (for quick reference)
    activeRooms: {
        type: [String],
        default: []
    },

    // Removed rooms (for history)
    removedRooms: {
        type: [String],
        default: []
    },

    // For backward compatibility
    roomIds: {
        type: [String],
        default: []
    },
    roomNumber: {
        type: String,
        default: ''
    },
    categoryId: {
        type: String,
        default: ''
    },
    categoryName: {
        type: String,
        default: ''
    },

    checkInDate: {
        type: Date,
        required: true
    },
    checkOutDate: {
        type: Date,
        required: true
    },
    durationLabel: {
        type: String,
        required: true
    },
    totalHours: {
        type: Number,
        required: true
    },

    // ===== PRICING BREAKDOWN =====
    activeRoomsTotal: {
        type: Number,
        default: 0,
        min: 0
    },
    removedRoomsTotal: {
        type: Number,
        default: 0,
        min: 0
    },
    basePrice: {
        type: Number,
        default: 0,
        min: 0
    },
    extraHoursPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    extraRequirements: {
        type: Array,
        default: []
    },
    extraRequirementsTotal: {
        type: Number,
        default: 0,
        min: 0
    },

    extraCharges: [extraChargeSchema],
    extraChargesTotal: {
        type: Number,
        default: 0,
        min: 0
    },

    discount: discountSchema,

    taxSlab: {
        type: Number,
        enum: [0, 5, 10, 18],
        default: 18
    },
    taxAmount: {
        type: Number,
        default: 0,
        min: 0
    },

    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    grandTotal: {
        type: Number,
        required: true,
        min: 0
    },
    discountAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    finalTotal: {
        type: Number,
        required: true,
        min: 0
    },

    // ===== PAYMENT STATUS =====
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Not Paid', 'Partial Paid'],
        default: 'Not Paid'
    },
    amountPaid: {
        type: Number,
        default: 0,
        min: 0
    },
    advancePaid: {
        type: Number,
        default: 0,
        min: 0
    },
    balanceAmount: {
        type: Number,
        default: 0,
        min: 0
    },

    // ===== PAYMENT TYPE & PAYMENT DETAILS =====
    paymentType: {
        type: String,
        enum: ['Cash', 'UPI', 'Bank', 'Cheque', 'Multiple'],
        default: 'Cash'
    },
    paymentDetails: [paymentDetailSchema],

    idProofs: [checkOutIdProofSchema],
    loyaltyPoints: loyaltyPointsSchema,

    notes: {
        type: String,
        default: '',
        trim: true
    },

    status: {
        type: String,
        enum: ['Completed', 'Partial', 'Cancelled'],
        default: 'Completed'
    },

    createdBy: {
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        userEmail: { type: String, required: true }
    },
    updatedBy: {
        userId: { type: String },
        userName: { type: String },
        userEmail: { type: String }
    },
    completedAt: {
        type: Date,
        default: Date.now
    },
    guestCheckOutAt: {
        type: Date,
        default: Date.now,
        description: "Actual time when guest physically checked out"
    },
}, {
    timestamps: true
});

// ============================================
// INDEXES
// ============================================
checkOutSchema.index({ checkInId: 1 });
checkOutSchema.index({ customerId: 1 });
checkOutSchema.index({ status: 1 });
checkOutSchema.index({ completedAt: -1 });
checkOutSchema.index({ customerPhone: 1 });
checkOutSchema.index({ bookingType: 1 });

// ============================================
// VIRTUAL: Total Rooms Count
// ============================================
checkOutSchema.virtual('totalRooms').get(function () {
    return this.roomDetails ? this.roomDetails.length : 0;
});

// ============================================
// VIRTUAL: Total Paid from Payment Details
// ============================================
checkOutSchema.virtual('totalPaidFromDetails').get(function () {
    if (!this.paymentDetails || this.paymentDetails.length === 0) return 0;
    return this.paymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0);
});

// ============================================
// VIRTUAL: Get Duration Display Label
// ============================================
checkOutSchema.virtual('displayDurationLabel').get(function () {
    if (this.bookingType === 'perNight') {
        return 'Night Stay';
    }
    return this.durationLabel || 'N/A';
});

// ============================================
// METHOD: Calculate Payment Type
// ============================================
checkOutSchema.methods.calculatePaymentType = function () {
    if (!this.paymentDetails || this.paymentDetails.length === 0) {
        return 'Cash';
    }

    const uniqueMethods = [...new Set(this.paymentDetails.map(p => p.method))];

    if (uniqueMethods.length > 1) {
        return 'Multiple';
    }

    return uniqueMethods[0] || 'Cash';
};

// ============================================
// METHOD: Calculate Totals (Discount BEFORE Tax)
// ============================================
checkOutSchema.methods.calculateTotals = function () {
    // Calculate active rooms total
    if (this.roomDetails && this.roomDetails.length > 0) {
        const activeRooms = this.roomDetails.filter(room => !room.isRemoved);
        const removedRooms = this.roomDetails.filter(room => room.isRemoved);

        this.activeRoomsTotal = activeRooms.reduce((sum, room) => sum + (room.price || 0), 0);
        this.removedRoomsTotal = removedRooms.reduce((sum, room) => sum + (room.price || 0), 0);
    }

    // Calculate extra charges total
    if (this.extraCharges && this.extraCharges.length > 0) {
        this.extraChargesTotal = this.extraCharges.reduce(
            (sum, charge) => sum + charge.price, 0
        );
    }

    // Calculate base price
    this.basePrice = this.activeRoomsTotal + this.removedRoomsTotal;

    // STEP 1: Subtotal (BEFORE discount and tax)
    this.subtotal = this.basePrice + this.extraHoursPrice +
        this.extraRequirementsTotal + this.extraChargesTotal;

    // STEP 2: Grand Total = Subtotal (BEFORE discount)
    this.grandTotal = this.subtotal;

    // STEP 3: Apply Discount on Subtotal (BEFORE tax)
    if (this.discount && this.discount.value > 0) {
        if (this.discount.type === 'percentage') {
            this.discountAmount = (this.subtotal * this.discount.value) / 100;
        } else {
            this.discountAmount = this.discount.value;
        }
        this.discountAmount = Math.min(this.discountAmount, this.subtotal);
        this.discount.amount = this.discountAmount;
    } else {
        this.discountAmount = 0;
        if (this.discount) {
            this.discount.amount = 0;
        }
    }

    const afterDiscount = Math.max(0, this.subtotal - this.discountAmount);

    // STEP 4: Apply Tax on After-Discount amount
    this.taxAmount = (afterDiscount * this.taxSlab) / 100;

    // STEP 5: Final Total = After Discount + Tax
    this.finalTotal = afterDiscount + this.taxAmount;

    // Calculate total paid from payment details
    const totalPaidFromDetails = this.paymentDetails
        ? this.paymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0)
        : 0;

    // Auto-set paymentType based on paymentDetails
    if (this.paymentDetails && this.paymentDetails.length > 0) {
        this.paymentType = this.calculatePaymentType();
    } else {
        this.paymentType = 'Cash';
    }

    // Calculate amount paid from payment details (if not explicitly set)
    if (this.paymentDetails && this.paymentDetails.length > 0) {
        if (!this.isModified('amountPaid') || this.amountPaid === 0) {
            this.amountPaid = totalPaidFromDetails;
        }
    }

    // Calculate balance
    const totalPaid = (this.amountPaid || 0) + (this.advancePaid || 0);
    this.balanceAmount = Math.max(0, this.finalTotal - totalPaid);

    // ✅ If Per Night, set duration label to "Night Stay"
    if (this.bookingType === 'perNight') {
        this.durationLabel = 'Night Stay';
    }
};

// ============================================
// PRE-SAVE: Auto-calculate totals
// ============================================
checkOutSchema.pre('save', async function () {
    this.calculateTotals();
});

// ============================================
// TOJSON
// ============================================
checkOutSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.__v;
        return ret;
    }
});

const CheckOut = mongoose.model('CheckOut', checkOutSchema);
module.exports = CheckOut;