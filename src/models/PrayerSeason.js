const mongoose = require('mongoose');

const prayerSeasonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  year: { type: Number },
  theme: { type: String },
  tagline: { type: String },
  description: { type: String },
  thumbnail: { type: String },
  bannerImage: { type: String },
  samplePreviewVideo: { type: String },
  startDate: { type: String },
  endDate: { type: String },
  price: { type: Number, default: 29 },
  status: { type: String, enum: ['active', 'upcoming', 'archived'], default: 'upcoming' },
  accessDays: { type: Number, default: 14 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PrayerSeason', prayerSeasonSchema);
