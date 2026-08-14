const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const categorySchema = new mongoose.Schema({
  categoryId: {
    type: String,
    unique: true,
    default: () => uuidv4(),
  },
  categoryName: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  // Pricing based on duration
  pricing: {
    perDay: {
      type: Number,
      required: [true, 'Per day price is required'],
      min: 0
    },
    perNight: {
      type: Number,
      required: [true, 'Per night price is required'],
      min: 0
    },
    per6Hours: {
      type: Number,
      required: [true, '6 hours price is required'],
      min: 0
    },
    per12Hours: {
      type: Number,
      required: [true, '12 hours price is required'],
      min: 0
    },
    extraHourCharge: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  maxOccupancy: {
    type: Number,
    default: 2,
    min: 1
  },
  amenities: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// ============================================
// INDEXES
// ============================================
categorySchema.index({ isActive: 1 });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;