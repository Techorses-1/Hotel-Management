const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const bookingHistorySchema = new mongoose.Schema({
  bookingId: {
    type: String,
    default: () => uuidv4(),
  },
  customerId: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  customerPhone: {
    type: String,
    required: true,
  },
  checkInDate: {
    type: Date,
    required: true,
  },
  checkOutDate: {
    type: Date,
    required: true,
  },
  advancePaid: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Checked-in', 'Cancelled', 'Completed'],
    default: 'Pending'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    unique: true,
    default: () => uuidv4(),
  },
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    unique: true,
    trim: true
  },
  categoryId: {
    type: String,
    required: [true, 'Category is required'],
    ref: 'Category'
  },
  // ✅ Store category name directly
  categoryName: {
    type: String,
    default: ''
  },
  floorNumber: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Maintenance', 'Cleaning', 'Booked'],
    default: 'Available'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  specialFeatures: {
    type: String,
    default: ''
  },
  bookingHistory: [bookingHistorySchema]
}, {
  timestamps: true
});

// ============================================
// INDEXES - NO DUPLICATES
// ============================================
// roomSchema.index({ roomNumber: 1 }); 
roomSchema.index({ categoryId: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ categoryName: 1 });

// ============================================
// PRE-SAVE: Auto-populate categoryName - NO next()
// ============================================
roomSchema.pre('save', async function () {
  // ✅ Only fetch category if categoryId exists and categoryName is empty
  if (this.categoryId && !this.categoryName) {
    const Category = mongoose.model('Category');
    const category = await Category.findOne({ categoryId: this.categoryId });
    if (category) {
      this.categoryName = category.categoryName;
    }
  }
});

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;