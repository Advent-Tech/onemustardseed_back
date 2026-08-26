const mongoose = require('mongoose');

const prayerAccessSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Expired'], default: 'Active' },
    expires: { type: String },
    progress: { type: Number, default: 0 }
}, {
    timestamps: true
});

module.exports = mongoose.model('PrayerAccess', prayerAccessSchema);
