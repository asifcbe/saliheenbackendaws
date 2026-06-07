const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const Settings = require('../models/Settings');

// Re-prices and validates an order request against the DB. Returns the data
// needed to persist an order WITHOUT writing anything or touching coupon usage.
// Used both by COD checkout and by payment verification, so the total a customer
// is charged is always recomputed server-side and can't be tampered with.
exports.buildOrderPayload = async ({ customerInfo, items, couponCode, paymentMethod }) => {
  let subtotal = 0;
  const enrichedItems = [];
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) throw Object.assign(new Error(`Product not found: ${item.product}`), { status: 404 });
    const variant = product.variants.find(v => v.ml === item.ml);
    if (!variant) throw Object.assign(new Error(`Variant ${item.ml}ml not found`), { status: 400 });
    subtotal += variant.price * item.quantity;
    enrichedItems.push({
      product: product._id, name: product.name,
      image: product.images[0] || '', type: product.type,
      ml: item.ml, price: variant.price, quantity: item.quantity
    });
  }

  // Resolve coupon eligibility, but do NOT increment usedCount here — that only
  // happens when the order is actually persisted (see persistOrder).
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
      }
    }
  }

  // Shipping is dynamic by payment method: COD adds the configurable COD charge,
  // online-paid orders use the base shipping charge (0 = free by default).
  const siteSettings = await Settings.findOne();
  const shippingCharge = paymentMethod === 'cod'
    ? (siteSettings?.codCharge ?? 100)
    : (siteSettings?.shippingCharge || 0);
  const total = Math.max(subtotal - discount, 0) + shippingCharge;

  return { customerInfo, items: enrichedItems, subtotal, discount, shippingCharge, couponCode: appliedCoupon, total };
};

// Writes the order to the DB and consumes one use of its coupon (if any).
// This is the single place an order becomes real — for COD on checkout, and
// for online payments only after the payment is verified.
exports.persistOrder = async (payload, { user, paymentMethod, paymentStatus, orderStatus, razorpayOrderId, razorpayPaymentId, razorpaySignature } = {}) => {
  if (payload.couponCode) {
    await Coupon.updateOne({ code: payload.couponCode }, { $inc: { usedCount: 1 } });
  }
  const order = await Order.create({
    user, ...payload, paymentMethod,
    paymentStatus: paymentStatus || 'pending',
    ...(orderStatus ? { orderStatus } : {}),
    razorpayOrderId, razorpayPaymentId, razorpaySignature
  });
  await order.populate('user', 'name email');
  return order;
};

exports.createOrder = async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    // Online payments must NOT create an order here. The order is persisted only
    // after the payment is verified, so abandoned/failed payments leave no order.
    if (paymentMethod !== 'cod') {
      return res.status(400).json({ message: 'Online orders are placed after payment is verified.' });
    }
    const payload = await exports.buildOrderPayload(req.body);
    const order = await exports.persistOrder(payload, {
      user: req.user?._id,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      orderStatus: 'placed'
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
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
