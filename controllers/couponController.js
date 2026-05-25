const Coupon = require('../models/Coupon');

exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getActiveCouponsForCheckout = async (req, res) => {
  try {
    const coupons = await Coupon.find({
      isActive: true, showOnCheckout: true, expiryDate: { $gt: new Date() }
    }).select('code description discountType discountValue minOrderAmount expiryDate');
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getExpiringCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({
      isActive: true, showOnCheckout: true, expiryDate: { $gt: new Date() }
    }).sort({ expiryDate: 1 }).select('code description discountType discountValue expiryDate');
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });
    if (new Date(coupon.expiryDate) < new Date()) return res.status(400).json({ message: 'Coupon has expired' });
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    if (orderAmount < coupon.minOrderAmount)
      return res.status(400).json({ message: `Minimum order amount is ₹${coupon.minOrderAmount}` });
    let discount = coupon.discountType === 'percentage'
      ? Math.min((orderAmount * coupon.discountValue) / 100, coupon.maxDiscount || Infinity)
      : coupon.discountValue;
    res.json({ valid: true, discount, coupon: { code: coupon.code, description: coupon.description, discountType: coupon.discountType, discountValue: coupon.discountValue } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create({ ...req.body, code: req.body.code.toUpperCase() });
    res.status(201).json(coupon);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Coupon code already exists' });
    res.status(500).json({ message: err.message });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
