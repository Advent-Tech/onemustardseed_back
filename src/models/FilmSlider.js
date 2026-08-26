const mongoose = require('mongoose');

const filmSliderSchema = new mongoose.Schema({
    badgeText: { type: String, default: 'OMS ORIGINAL CINEMA' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    primaryButtonText: { type: String, default: 'PLAY FEATURED' },
    primaryButtonLink: { type: String, default: '#' },
    secondaryButtonText: { type: String, default: 'WATCH TRAILER' },
    secondaryButtonLink: { type: String, default: '#' },
    backgroundVideoUrl: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('FilmSlider', filmSliderSchema);
