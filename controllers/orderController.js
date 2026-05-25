const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const Settings = require('../models/Settings');

exports.createOrder = async (req, res) => {
  try {
    const { customerInfo, items, couponCode, paymentMethod } = req.body;
    let subtotal = 0;
    const enrichedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ message: `Product not found: ${item.product}` });
      const variant = product.variants.find(v => v.ml === item.ml);
      if (!variant) return res.status(400).json({ message: `Variant ${item.ml}ml not found` });
      const lineTotal = variant.price * item.quantity;
      subtotal += lineTotal;
      enrichedItems.push({
        product: product._id, name: product.name,
        image: product.images[0] || '', type: product.type,
        ml: item.ml, price: variant.price, quantity: item.quantity
      });
    }
    let discount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon && new Date(coupon.expiryDate) > new Date() && subtotal >= coupon.minOrderAmount) {
        if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
          discount = coupon.discountType === 'percentage'
            ? Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity)
            : coupon.discountValue;
          appliedCoupon = coupon.code;
          coupon.usedCount += 1;
          await coupon.save();
        }
      }
    }
    const siteSettings = await Settings.findOne();
    const shippingCharge = siteSettings?.shippingCharge || 0;
    const total = Math.max(subtotal - discount, 0) + shippingCharge;
    const order = await Order.create({
      user: req.user?._id, customerInfo, items: enrichedItems,
      subtotal, discount, shippingCharge, couponCode: appliedCoupon, total,
      paymentMethod,
      paymentStatus: 'pending'
    });
    await order.populate('user', 'name email');
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (status) query.orderStatus = status;
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customerInfo.name': { $regex: search, $options: 'i' } },
        { 'customerInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('user', 'name email');
    res.json({ orders, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrderByOrderId = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrdersByPhone = async (req, res) => {
  try {
    const phone = req.params.phone.trim();
    const orders = await Order.find({ 'customerInfo.phone': { $regex: phone, $options: 'i' } })
      .sort({ createdAt: -1 })
      .select('-razorpaySignature -__v');
    if (!orders.length) return res.status(404).json({ message: 'No orders found for this phone number' });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.orderStatus = req.body.orderStatus || order.orderStatus;
    order.paymentStatus = req.body.paymentStatus || order.paymentStatus;
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.resetAllOrders = async (req, res) => {
  try {
    const result = await Order.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} orders` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrderStats = async (req, res) => {
  try {
    const total = await Order.countDocuments();
    const revenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const byStatus = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ]);
    res.json({ total, revenue: revenue[0]?.total || 0, byStatus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
