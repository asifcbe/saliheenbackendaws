const router = require('express').Router();
const { getLanding, updateLanding, uploadCarouselImage, deleteCarouselImage, uploadHistoryImage } = require('../controllers/landingController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getLanding);
router.put('/', protect, adminOnly, updateLanding);
router.post('/carousel', protect, adminOnly, upload.single('image'), uploadCarouselImage);
router.delete('/carousel/:imageId', protect, adminOnly, deleteCarouselImage);
router.post('/history-image', protect, adminOnly, upload.single('image'), uploadHistoryImage);

module.exports = router;
