const router = require('express').Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getSettings);
router.put('/', protect, adminOnly, upload.single('logo'), updateSettings);

module.exports = router;
