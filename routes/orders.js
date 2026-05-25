const router = require('express').Router();
const { createOrder, getOrders, getMyOrders, getOrder, getOrderByOrderId, getOrdersByPhone, updateOrderStatus, getOrderStats, deleteOrder, resetAllOrders } = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');

const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      require('../models/User').findById(decoded.id).select('-password').then(user => {
        req.user = user;
        next();
      });
    } catch { next(); }
  } else next();
};

router.post('/', optionalAuth, createOrder);
router.get('/', protect, adminOnly, getOrders);
router.get('/stats', protect, adminOnly, getOrderStats);
router.get('/my', protect, getMyOrders);
router.get('/track/:orderId', getOrderByOrderId);
router.get('/track-phone/:phone', getOrdersByPhone);
router.get('/:id', protect, adminOnly, getOrder);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);
router.delete('/reset-all', protect, adminOnly, resetAllOrders);
router.delete('/:id', protect, adminOnly, deleteOrder);

module.exports = router;
