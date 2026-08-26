const mongoose = require('mongoose');

const kidsEpisodeSchema = new mongoose.Schema({
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'KidsSeries', required: true },
  title: { type: String, required: true },
  description: { type: String },
  vimeoLink: { type: String },
  audioLink: { type: String },
  length: { type: String, default: "00:00" },
  img: { type: String },
  views: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('KidsEpisode', kidsEpisodeSchema);
