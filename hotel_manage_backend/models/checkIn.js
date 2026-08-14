const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ============================================
// EXTRA REQUIREMENT SUB-SCHEMA
// ============================================
const extraRequirementSchema = new mongoose.Schema({
  requirementId: {
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
  }
});

// ============================================
// ROOM DETAIL SUB-SCHEMA (With INDIVIDUAL DATES)
// ============================================
const roomDetailSchema = new mongoose.Schema({
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
  totalHours: Number,
  totalDays: Number,
  remainingHours: Number,
  durationLabel: String
});

// ============================================
// REMOVED ROOMS SUB-SCHEMA
// ============================================
const removedRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  },
  categoryName: {
    type: String,
    required: true
  },
  categoryId: {
    type: String,
    required: false,
  },
  checkInDate: {
    type: Date,
    required: true
  },
  checkOutDate: {
    type: Date,
    required: true
  },
  actualCheckOut: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  hoursUsed: {
    type: Number,
    default: 0
  },
  durationLabel: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    default: ''
  },
  removedAt: {
    type: Date,
    default: Date.now
  }
});

// ============================================
// ROOM EXTENSION SUB-SCHEMA
// ============================================
const roomExtensionSchema = new mongoose.Schema({
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
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    default: 'Extension'
  }
});

// ============================================
// ID PROOF SUB-SCHEMA (WITH LABEL)
// ============================================
const idProofSchema = new mongoose.Schema({
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
// MAIN CHECK-IN SCHEMA
// ============================================
const checkInSchema = new mongoose.Schema({
  checkInId: {
    type: String,
    unique: true,
    default: () => uuidv4(),
  },
  checkInNumber: {
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

  // ===== MULTIPLE ROOMS =====
  roomIds: {
    type: [String],
    required: true,
    index: true
  },
  roomDetails: [roomDetailSchema],
  removedRooms: [removedRoomSchema],

  // For backward compatibility (first room)
  roomId: {
    type: String,
    index: true
  },
  roomNumber: String,
  categoryId: String,
  categoryName: String,

  // ===== DATE & DURATION =====
  checkInDate: {
    type: Date,
    required: true,
    index: true
  },
  checkOutDate: {
    type: Date,
    required: true,
    index: true
  },
  userSelectedCheckOut: {
    type: Date,
    required: true
  },

  // Duration Breakdown
  totalHours: {
    type: Number,
    required: true,
    min: 1
  },
  totalDays: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingHours: {
    type: Number,
    default: 0,
    min: 0
  },
  durationLabel: {
    type: String,
    required: true
  },

  // ===== PRICING =====
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
  extraRequirements: [extraRequirementSchema],
  extraRequirementsTotal: {
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

  // ===== ID PROOFS =====
  idProofs: [idProofSchema],

  // ===== BOOKING REFERENCE =====
  bookingId: {
    type: String,
    default: null,
    index: true
  },
  bookingNumber: {
    type: String,
    default: null
  },

  // ===== EXTENSION =====
  isExtended: {
    type: Boolean,
    default: false
  },
  originalCheckOut: {
    type: Date,
    default: null
  },
  extensionRooms: [roomExtensionSchema],

  // ===== STATUS =====
  status: {
    type: String,
    enum: ['Active', 'Checked-out', 'Extended', 'Cancelled'],
    default: 'Active',
    index: true
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
  },
  checkedOutBy: {
    userId: { type: String },
    userName: { type: String },
    userEmail: { type: String }
  },
  checkedOutAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// ============================================
// INDEXES
// ============================================
checkInSchema.index({ customerId: 1, status: 1 });
checkInSchema.index({ roomIds: 1, status: 1 });
checkInSchema.index({ checkInDate: 1, checkOutDate: 1 });
checkInSchema.index({ status: 1, checkInDate: -1 });
checkInSchema.index({ customerPhone: 1 });
checkInSchema.index({ createdAt: -1 });
checkInSchema.index({ bookingNumber: 1 });
checkInSchema.index({ bookingType: 1 });

// ============================================
// VIRTUAL: Total Rooms Count
// ============================================
checkInSchema.virtual('totalRooms').get(function () {
  return this.roomDetails ? this.roomDetails.length : (this.roomId ? 1 : 0);
});

// ============================================
// VIRTUAL: Total Paid from Payment Details
// ============================================
checkInSchema.virtual('totalPaidFromDetails').get(function () {
  if (!this.paymentDetails || this.paymentDetails.length === 0) return 0;
  return this.paymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0);
});

// ============================================
// VIRTUAL: Get Duration Display Label
// ============================================
checkInSchema.virtual('displayDurationLabel').get(function () {
  if (this.bookingType === 'perNight') {
    return 'Night Stay';
  }
  return this.durationLabel || 'N/A';
});

// ============================================
// METHOD: Calculate Duration and Price
// ============================================
checkInSchema.methods.calculateDurationAndPrice = function (checkInDate, checkOutDate, pricing) {
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  const diffMs = end - start;
  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));

  let basePrice = 0;
  let extraHoursPrice = 0;
  let durationLabel = '';
  let totalDays = 0;
  let remainingHours = 0;
  let systemCalculatedCheckOut = new Date(start);

  if (totalHours <= 6) {
    basePrice = pricing.per6Hours || 0;
    durationLabel = '6 Hours';
    systemCalculatedCheckOut.setHours(start.getHours() + 6);
  } else if (totalHours <= 12) {
    basePrice = pricing.per12Hours || 0;
    durationLabel = '12 Hours';
    systemCalculatedCheckOut.setHours(start.getHours() + 12);
  } else {
    totalDays = Math.floor(totalHours / 24);
    remainingHours = totalHours % 24;

    basePrice = totalDays * (pricing.perDay || 0);

    if (remainingHours === 0) {
      durationLabel = totalDays === 1 ? '1 Day' : `${totalDays} Days`;
      systemCalculatedCheckOut.setHours(start.getHours() + (totalDays * 24));
    } else if (remainingHours <= 6) {
      extraHoursPrice = pricing.per6Hours || 0;
      durationLabel = totalDays === 1 ? '1 Day + 6 Hours' : `${totalDays} Days + 6 Hours`;
      systemCalculatedCheckOut.setHours(start.getHours() + (totalDays * 24) + 6);
    } else if (remainingHours <= 12) {
      extraHoursPrice = pricing.per12Hours || 0;
      durationLabel = totalDays === 1 ? '1 Day + 12 Hours' : `${totalDays} Days + 12 Hours`;
      systemCalculatedCheckOut.setHours(start.getHours() + (totalDays * 24) + 12);
    } else {
      basePrice = (totalDays + 1) * (pricing.perDay || 0);
      durationLabel = totalDays + 1 === 1 ? '1 Day' : `${totalDays + 1} Days`;
      systemCalculatedCheckOut.setHours(start.getHours() + ((totalDays + 1) * 24));
      remainingHours = 0;
      extraHoursPrice = 0;
    }
  }

  return {
    totalHours,
    totalDays,
    remainingHours,
    durationLabel,
    basePrice,
    extraHoursPrice,
    subtotal: basePrice + extraHoursPrice,
    systemCalculatedCheckOut
  };
};

// ============================================
// METHOD: Calculate Payment Type
// ============================================
checkInSchema.methods.calculatePaymentType = function () {
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
checkInSchema.pre('save', async function () {
  // Calculate extras total
  if (this.extraRequirements && this.extraRequirements.length > 0) {
    this.extraRequirementsTotal = this.extraRequirements.reduce(
      (sum, req) => sum + req.price, 0
    );
  }

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

  // Calculate subtotal (basePrice comes from frontend - NO RECALCULATION)
  this.subtotal = (this.basePrice || 0) + (this.extraHoursPrice || 0) + (this.extraRequirementsTotal || 0);

  // Calculate tax
  this.taxAmount = (this.subtotal * (this.taxSlab || 18)) / 100;

  // Calculate grand total
  this.grandTotal = this.subtotal + this.taxAmount;

  // Calculate amount paid from payment details (if not explicitly set)
  if (this.paymentDetails && this.paymentDetails.length > 0) {
    if (!this.isModified('amountPaid') || this.amountPaid === 0) {
      this.amountPaid = totalPaidFromDetails;
    }
  }

  // Calculate balance
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
  }
});

// ============================================
// TOJSON
// ============================================
checkInSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const CheckIn = mongoose.model('CheckIn', checkInSchema);
module.exports = CheckIn;