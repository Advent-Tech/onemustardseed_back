const mongoose = require('mongoose');

const prayerVideoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    duration: { type: String, default: '00:00' },
    resources: { type: String, default: '' },
    downloads: { type: String, default: '' },
    status: { type: String, enum: ['Live', 'Published', 'Scheduled'], default: 'Scheduled' },
    views: { type: Number, default: 0 },
    uploads: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('PrayerVideo', prayerVideoSchema);
