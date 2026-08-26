const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema({
  title: { type: String },
  type: { type: String, enum: ['PDF', 'ZIP', 'MP4', 'PPTX', 'Link', 'Other'], default: 'PDF' },
  size: { type: String },
  description: { type: String },
  fileUrl: { type: String }
});

const prayerEpisodeSchema = new mongoose.Schema({
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrayerSeason', required: true },
  day: { type: Number, required: true }, // 1 to 5
  title: { type: String, required: true },
  speaker: { type: String },
  description: { type: String },
  duration: { type: String, default: '00:00' },
  thumbnail: { type: String },
  videoUrl: { type: String },
  
  // Daily Resource (Study guides, devotional, etc.)
  resourceTitle: { type: String },
  resourceScripture: { type: String },
  resourceDevotional: { type: String },
  resourcePoints: [{ type: String }],
  
  // File Downloads (Promo materials, Leader instructions, Study guides PDF)
  downloads: [downloadSchema]

}, { timestamps: true });

module.exports = mongoose.model('PrayerEpisode', prayerEpisodeSchema);
