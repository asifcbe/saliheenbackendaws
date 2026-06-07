const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const { buildOrderPayload, persistOrder } = require('./orderController');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Creates a Razorpay order from the cart WITHOUT persisting our own Order.
// The total is recomputed server-side so the amount Razorpay charges is the
// source of truth; the local order is only written after payment is verified.
exports.createRazorpayOrder = async (req, res) => {
  try {
    const payload = await buildOrderPayload(req.body);
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(payload.total * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    });
    res.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;

    // 1. Signature check — proves Razorpay (not the client) reported the payment.
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // 2. Confirm Razorpay actually captured this payment for the expected amount.
    const payload = await buildOrderPayload(orderData);
    const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
    if (rzpOrder.amount_paid < Math.round(payload.total * 100)) {
      return res.status(400).json({ success: false, message: 'Payment amount mismatch' });
    }

    // 3. Idempotency — if this payment was already recorded, return that order.
    const existing = await Order.findOne({ razorpayPaymentId: razorpay_payment_id });
    if (existing) {
      return res.json({ success: true, orderId: existing.orderId, message: 'Payment already verified' });
    }

    // 4. Only now does the order become real.
    const order = await persistOrder(payload, {
      user: req.user?._id,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    });

    res.json({ success: true, orderId: order.orderId, message: 'Payment verified successfully' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.getPaymentDetails = async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);
    res.json(payment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
