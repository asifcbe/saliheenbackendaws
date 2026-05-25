const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  description: String,
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount: { type: Number },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  showOnCheckout: { type: Boolean, default: false },
  usageLimit: { type: Number },
  usedCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
