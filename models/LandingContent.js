const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  text: String,
  language: String,
  englishMeaning: String,
  author: String
});

const carouselImageSchema = new mongoose.Schema({
  url: String,
  alt: String,
  caption: String,
  subcaption: String
});

const landingSchema = new mongoose.Schema({
  heroTitle: { type: String, default: 'Saliheen Perfumes' },
  heroSubtitle: { type: String, default: 'The Essence of Luxury' },
  carouselImages: [carouselImageSchema],
  quotes: [quoteSchema],
  historyTitle: { type: String, default: 'The History of Perfumes & Attar' },
  historyText: { type: String, default: '' },
  historyImage: String,
  youtubeVideoId: { type: String, default: '' },
  youtubeTitle: { type: String, default: 'Our Story' }
}, { timestamps: true });

module.exports = mongoose.model('LandingContent', landingSchema);
