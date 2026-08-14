const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,  // ✅ This creates an index
      default: () => uuidv4(),
    },
    name: {
      type: String,
      required: [true, 'Name is required']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true  // ✅ This creates an index
    },
    phone: {
      type: String,
      required: [true, 'Phone is required']
    },
    password: {
      type: String,
      required: [true, 'Password is required']
    },
    permissions: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// ============================================
// INDEXES
// ============================================
// ❌ REMOVED: userSchema.index({ email: 1 }); // Duplicate - unique already creates index
// ❌ REMOVED: userSchema.index({ userId: 1 }); // Duplicate - unique already creates index
// ✅ Add index for phone if frequently searched
userSchema.index({ phone: 1 });  // Optional - for faster phone lookups

const User = mongoose.model('User', userSchema);
module.exports = User;