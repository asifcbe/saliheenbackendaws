const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  ml: { type: Number, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  images: [{ type: String }],
  type: { type: String, enum: ['perfume', 'attar'], required: true },
  variants: [variantSchema],
  category: { type: String, default: 'general' },
  featured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  tags: [String]
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
