const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  storeName: { type: String, default: 'Saliheen Perfumes' },
  storeTagline: { type: String, default: 'The Essence of Luxury' },
  logo: { type: String },
  storeEmail: { type: String, default: 'info@saliheenperfumes.com' },
  storePhone: { type: String, default: '+91 XXXXXXXXXX' },
  storeAddress: String,
  codEnabled: { type: Boolean, default: true },
  razorpayKeyId: { type: String, default: 'rzp_test_SgTH0ctSdvsPBb' },
  socialLinks: {
    instagram: String,
    facebook: String,
    whatsapp: String,
    youtube: String
  },
  metaDescription: String,
  favicon: String,
  shippingCharge: { type: Number, default: 0 },
  theme: { type: String, default: 'midnight-gold' }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
