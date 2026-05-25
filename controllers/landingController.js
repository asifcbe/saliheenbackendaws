const LandingContent = require('../models/LandingContent');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

exports.getLanding = async (req, res) => {
  try {
    let content = await LandingContent.findOne();
    if (!content) content = await LandingContent.create({});
    res.json(content);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateLanding = async (req, res) => {
  try {
    let content = await LandingContent.findOne();
    if (!content) content = new LandingContent();
    const fields = ['heroTitle', 'heroSubtitle', 'historyTitle', 'historyText', 'youtubeVideoId', 'youtubeTitle'];
    fields.forEach(f => { if (req.body[f] !== undefined) content[f] = req.body[f]; });
    if (req.body.quotes) content.quotes = typeof req.body.quotes === 'string' ? JSON.parse(req.body.quotes) : req.body.quotes;
    if (req.body.carouselImages) content.carouselImages = typeof req.body.carouselImages === 'string' ? JSON.parse(req.body.carouselImages) : req.body.carouselImages;
    await content.save();
    res.json(content);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.uploadCarouselImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const result = await uploadToCloudinary(req.file, 'saliheen/carousel');
    const url = result.secure_url;
    let content = await LandingContent.findOne();
    if (!content) content = await LandingContent.create({});
    const { alt, caption, subcaption } = req.body;
    content.carouselImages.push({ url, alt: alt || '', caption: caption || '', subcaption: subcaption || '' });
    await content.save();
    res.json({ url, content });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCarouselImage = async (req, res) => {
  try {
    let content = await LandingContent.findOne();
    if (!content) return res.status(404).json({ message: 'Not found' });
    const image = content.carouselImages.id(req.params.imageId);
    if (image) {
      await deleteFromCloudinary(image.url);
      image.deleteOne();
      await content.save();
    }
    res.json({ message: 'Image removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.uploadHistoryImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    let content = await LandingContent.findOne();
    if (!content) content = await LandingContent.create({});
    if (content.historyImage) await deleteFromCloudinary(content.historyImage);
    const result = await uploadToCloudinary(req.file, 'saliheen/landing');
    content.historyImage = result.secure_url;
    await content.save();
    res.json({ url: content.historyImage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
