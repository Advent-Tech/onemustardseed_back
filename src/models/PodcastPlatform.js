const mongoose = require('mongoose');

const podcastPlatformSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  iconUrl: { type: String, required: true },
  color: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('PodcastPlatform', podcastPlatformSchema);
