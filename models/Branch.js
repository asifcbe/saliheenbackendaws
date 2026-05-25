const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: String,
  state: String,
  phone: String,
  email: String,
  timings: String,
  googleMapLink: String,
  googleMapEmbed: String,
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  isComingSoon: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);
