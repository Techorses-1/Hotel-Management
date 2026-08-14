const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ============================================
// ROOM DETAIL SUB-SCHEMA (For Multiple Rooms)
// ============================================
const bookingRoomDetailSchema = new mongoose.Schema({
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
// MAIN BOOKING SCHEMA
// ============================================
const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    default: () => uuidv4(),
  },
  bookingNumber: {
    type: String,
    unique: true,
    required: true
  },

  // ===== BOOKING TYPE =====
  bookingType: {
    type: String,
    enum: ['simple', 'perNight'],
    default: 'simple',
    required: true
  },

  // ===== CUSTOMER DETAILS =====
  customerId: {
    type: String,
    required: true,
    index: true
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

  // ===== ROOMS =====
  roomIds: {
    type: [String],
    required: true,
    index: true
  },
  roomDetails: [bookingRoomDetailSchema],

  // For backward compatibility
  roomId: {
    type: String,
    index: true
  },
  roomNumber: String,
  categoryId: String,
  categoryName: String,

  // ===== DATE & TIME =====
  checkInDate: {
    type: Date,
    required: true,
    index: true
  },

  // ✅ SYSTEM CALCULATED CHECK-OUT
  checkOutDate: {
    type: Date,
    required: true,
    index: true
  },

  // ✅ USER SELECTED CHECK-OUT (Internal reference only)
  userSelectedCheckOut: {
    type: Date,
    required: true
  },

  // Duration Breakdown (for display only, NO PRICE CALCULATION)
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

  // ===== PRICING =====
  // ✅ Base price is now the TOTAL of all room prices (sent from frontend)
  basePrice: {
    type: Number,
    required: true,
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

  // ===== PER NIGHT PRICE =====
  perNightPrice: {
    type: Number,
    default: 0,
    min: 0
  },

  // ===== TAX =====
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

  // ===== TOTALS =====
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

  // ===== REFUND (for cancellation) =====
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // ===== REMOVED ROOMS =====
  removedRooms: [{
    roomId: String,
    roomNumber: String,
    categoryName: String,
    price: Number,
    reason: String,
    removedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ===== BOOKING STATUS =====
  status: {
    type: String,
    enum: ['Confirmed', 'Cancelled', 'Checked-in'],
    default: 'Confirmed',
    index: true
  },

  // ===== CANCELLATION =====
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelledBy: {
    userId: { type: String },
    userName: { type: String },
    userEmail: { type: String }
  },
  cancellationReason: {
    type: String,
    default: ''
  },

  // ===== CHECK-IN REFERENCE =====
  checkInId: {
    type: String,
    default: null,
    index: true
  },
  checkInNumber: {
    type: String,
    default: null
  },

  // ===== NOTES =====
  notes: {
    type: String,
    default: '',
    trim: true
  },

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
bookingSchema.index({ customerId: 1, status: 1 });
bookingSchema.index({ roomIds: 1, status: 1 });
bookingSchema.index({ checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ status: 1, checkInDate: -1 });
bookingSchema.index({ customerPhone: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ userSelectedCheckOut: 1 });
bookingSchema.index({ bookingType: 1 });

// ============================================
// VIRTUAL: Total Rooms Count
// ============================================
bookingSchema.virtual('totalRooms').get(function () {
  return this.roomDetails ? this.roomDetails.length : (this.roomId ? 1 : 0);
});

// ============================================
// VIRTUAL: Is Upcoming
// ============================================
bookingSchema.virtual('isUpcoming').get(function () {
  const now = new Date();
  return this.status === 'Confirmed' && this.checkInDate > now;
});

// ============================================
// VIRTUAL: Total Paid from Payment Details
// ============================================
bookingSchema.virtual('totalPaidFromDetails').get(function () {
  if (!this.paymentDetails || this.paymentDetails.length === 0) return 0;
  return this.paymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0);
});

// ============================================
// VIRTUAL: Get Duration Display Label
// ============================================
bookingSchema.virtual('displayDurationLabel').get(function () {
  if (this.bookingType === 'perNight') {
    return 'Night Stay';
  }
  return this.durationLabel || 'N/A';
});

// ============================================
// METHOD: Calculate Payment Type
// ============================================
bookingSchema.methods.calculatePaymentType = function () {
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
// PRE-SAVE: Auto-calculate fields (NO PRICE RECALCULATION)
// ============================================
bookingSchema.pre('save', async function () {
  // ✅ Calculate extras total
  if (this.extraRequirements && this.extraRequirements.length > 0) {
    this.extraRequirementsTotal = this.extraRequirements.reduce(
      (sum, req) => sum + (req.price || 0), 0
    );
  }

  // ✅ Calculate total paid from payment details
  const totalPaidFromDetails = this.paymentDetails
    ? this.paymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0)
    : 0;

  // ✅ Auto-set paymentType based on paymentDetails
  if (this.paymentDetails && this.paymentDetails.length > 0) {
    this.paymentType = this.calculatePaymentType();
  } else {
    this.paymentType = 'Cash';
  }

  // ✅ Calculate subtotal (basePrice comes from frontend - NO RECALCULATION)
  this.subtotal = (this.basePrice || 0) + (this.extraHoursPrice || 0) + (this.extraRequirementsTotal || 0);

  // Calculate tax
  this.taxAmount = (this.subtotal * (this.taxSlab || 18)) / 100;

  // Calculate grand total
  this.grandTotal = this.subtotal + this.taxAmount;

  // ✅ Calculate amount paid from payment details (if not explicitly set)
  if (this.paymentDetails && this.paymentDetails.length > 0) {
    if (!this.isModified('amountPaid') || this.amountPaid === 0) {
      this.amountPaid = totalPaidFromDetails;
    }
  }

  // Calculate total paid (amountPaid + advancePaid)
  const totalPaid = (this.amountPaid || 0) + (this.advancePaid || 0);
  this.balanceAmount = Math.max(0, this.grandTotal - totalPaid);

  // Auto-update payment status based on balance
  if (this.balanceAmount === 0 && this.grandTotal > 0) {
    this.paymentStatus = 'Paid';
  } else if (this.balanceAmount < this.grandTotal && this.balanceAmount > 0) {
    this.paymentStatus = 'Partial Paid';
  } else if (this.balanceAmount === this.grandTotal) {
    this.paymentStatus = 'Not Paid';
  }

  // ✅ If Per Night, set duration label to "Night Stay"
  if (this.bookingType === 'perNight') {
    this.durationLabel = 'Night Stay';
    // ✅ Ensure totalHours is set but not used for pricing
    if (!this.totalHours || this.totalHours === 0) {
      const start = new Date(this.checkInDate);
      const end = new Date(this.userSelectedCheckOut || this.checkOutDate);
      this.totalHours = Math.ceil((end - start) / (1000 * 60 * 60));
    }
  }
});

// ============================================
// TOJSON
// ============================================
bookingSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;