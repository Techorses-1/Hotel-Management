const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const customerSchema = new mongoose.Schema({
  customerId: {
    type: String,
    unique: true,  // ✅ This already creates an index
    default: () => uuidv4(),
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required']
  },
  email: {
    type: String,
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required']
  },
  loyaltyCoins: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// ============================================
// INDEXES
// ============================================
// ❌ REMOVED: customerSchema.index({ customerId: 1 }); // Duplicate - unique: true already creates index
customerSchema.index({ email: 1 });          // ✅ Keep - for email lookups
customerSchema.index({ contactNumber: 1 });  // ✅ Keep - for phone lookups
customerSchema.index({ customerName: 1 });   // ✅ Keep - for search by name

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;