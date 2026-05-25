const router = require('express').Router();
const { createRazorpayOrder, verifyPayment, getPaymentDetails } = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyPayment);
router.get('/details/:paymentId', protect, adminOnly, getPaymentDetails);

module.exports = router;
