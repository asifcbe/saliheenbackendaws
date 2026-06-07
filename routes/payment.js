const router = require('express').Router();
const { createRazorpayOrder, verifyPayment, getPaymentDetails } = require('../controllers/paymentController');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

router.post('/create-order', optionalAuth, createRazorpayOrder);
router.post('/verify', optionalAuth, verifyPayment);
router.get('/details/:paymentId', protect, adminOnly, getPaymentDetails);

module.exports = router;
