const mongoose = require('mongoose');

const filmSchema = new mongoose.Schema({
    title: { type: String, required: true },
    year: { type: String, required: true },
    duration: { type: String, required: true },
    price: { type: String, required: true },
    rentPrice: { type: String, required: true },
    rating: { type: String, default: '0.0' },
    status: { type: String, default: 'Published' },
    sales: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    thumbnail: { type: String, default: '' },
    trailer: { type: String, default: '' },
    movieLink: { type: String, default: '' },
    desc: { type: String, default: '' },
    screeningInfo: { type: String, default: '' },
    promoFileUrl: { type: String, default: '' },
    isFeatured: { type: Boolean, default: false },
    isUpcoming: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    watchHours: { type: Number, default: 0 },
    reviews: [{
        user: { type: String, default: 'Guest User' },
        text: { type: String, required: true },
        rating: { type: Number, required: true },
        date: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Film', filmSchema);
