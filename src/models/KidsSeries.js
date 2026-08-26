const mongoose = require('mongoose');

const kidsSeriesSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  topic: { type: String, required: true }, // Kindness, Courage, etc.
  contentType: { type: String, default: 'Creation Case' }, // Audio, Creation Case, OMS
  image: { type: String }, // Banner Image URL/Path
  trailer: { type: String }, // Vimeo Link
  audioLink: { type: String }, // Soundcloud/Audio URL
  status: { type: String, enum: ['Active', 'Draft', 'Pending'], default: 'Active' },
  subscribers: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('KidsSeries', kidsSeriesSchema);
