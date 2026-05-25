const Settings = require('../models/Settings');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    const fields = ['storeName', 'storeTagline', 'storeEmail', 'storePhone', 'storeAddress', 'codEnabled', 'razorpayKeyId', 'metaDescription', 'shippingCharge', 'theme'];
    fields.forEach(f => { if (req.body[f] !== undefined) settings[f] = req.body[f]; });
    if (req.body.socialLinks !== undefined) {
      try {
        settings.socialLinks = typeof req.body.socialLinks === 'string'
          ? JSON.parse(req.body.socialLinks)
          : req.body.socialLinks;
      } catch {
        settings.socialLinks = { instagram: '', facebook: '', whatsapp: '', youtube: '' };
      }
    }
    if (req.file) {
      if (settings.logo) await deleteFromCloudinary(settings.logo);
      const result = await uploadToCloudinary(req.file, 'saliheen/settings');
      settings.logo = result.secure_url;
    }
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
