const mongoose = require('mongoose');

const TrackSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  duration: { type: String, default: '3:30' },
  audioUrl: { type: String, default: '' },
  order: { type: Number, default: 0 }
});

const AlbumSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  cover: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Draft'], default: 'Active' },
  songs: [TrackSchema],
  listensCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Album', AlbumSchema);
