const mongoose = require('mongoose');

const podcastEpisodeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PodcastSeason',
    required: true,
  },
  audioUrl: {
    type: String,
    required: true,
  },
  duration: {
    type: String,
    default: '00:00',
  },
  description: {
    type: String,
    default: '',
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

module.exports = mongoose.model('PodcastEpisode', podcastEpisodeSchema);
