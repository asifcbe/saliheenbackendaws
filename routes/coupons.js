const router = require('express').Router();
const { getCoupons, getActiveCouponsForCheckout, getExpiringCoupon, validateCoupon, createCoupon, updateCoupon, deleteCoupon } = require('../controllers/couponController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/checkout', getActiveCouponsForCheckout);
router.get('/expiring', getExpiringCoupon);
router.post('/validate', validateCoupon);
router.get('/', protect, adminOnly, getCoupons);
router.post('/', protect, adminOnly, createCoupon);
router.put('/:id', protect, adminOnly, updateCoupon);
router.delete('/:id', protect, adminOnly, deleteCoupon);

module.exports = router;
