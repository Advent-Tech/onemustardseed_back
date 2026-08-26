const mongoose = require('mongoose');

const podcastSeasonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Active', 'Draft', 'Completed'],
    default: 'Draft',
  },
  resources: [{
    title: String,
    fileUrl: String,
    size: String,
  }],
  spotifyUrl: String,
  applePodcastsUrl: String,
  isPremium: {
    type: Boolean,
    default: false
  },
  image: {
    type: String,
    default: '',
  },
  episodesCount: {
    type: Number,
    default: 0,
  },
  listensCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PodcastSeason', podcastSeasonSchema);
