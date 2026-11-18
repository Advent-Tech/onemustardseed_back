const mongoose = require('mongoose');

const showtimeSchema = new mongoose.Schema({
    date: { type: String, required: true },
    day: { type: String, required: true },
    time: { type: String, required: true },
    timezone: { type: String, required: true },
    totalSpots: { type: Number, required: true },
    spotsLeft: { type: Number, required: true },
    status: { type: String, enum: ['selling', 'sold-out', 'closed'], default: 'selling' }
});

const venueSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    mapUrl: { type: String }
});

const cityScreeningSchema = new mongoose.Schema({
    city: { type: String, required: true },
    country: { type: String, required: true },
    flag: { type: String, required: true },
    venue: venueSchema,
    showtimes: [showtimeSchema]
});

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    available: { type: Number, required: true },
    facilities: { type: String, default: '' }
});

const reviewSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add an event name'],
        trim: true,
        maxlength: [100, 'Name can not be more than 100 characters']
    },
    subtitle: {
        type: String,
        maxlength: [200, 'Subtitle can not be more than 200 characters']
    },
    date: {
        type: String,
        required: [true, 'Please add a display date range (e.g. Aug 18 - 22)']
    },
    location: {
        type: String,
        default: 'Global'
    },
    // Optional now that ticketing happens on Zeffy.
    price: {
        type: String,
        default: ''
    },
    // Zeffy (or any) ticket page. Drives the "Buy Tickets" button on /events.
    ticketUrl: {
        type: String,
        trim: true,
        default: ''
    },
    // Free-text dates shown on the card, e.g. "Mar 6–8, 2027". Falls back to `date`.
    dateLabel: {
        type: String,
        trim: true,
        default: ''
    },
    capacity: {
        type: Number,
        default: 0
    },
    ticketsSold: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        maxlength: [1000, 'Description can not be more than 1000 characters']
    },
    image: {
        type: String,
        default: 'no-photo.jpg'
    },
    gallery: {
        type: [String],
        default: []
    },
    status: {
        type: String,
        enum: ['Active', 'Draft', 'Past', 'Sold Out'],
        default: 'Active'
    },
    cities: [cityScreeningSchema],
    categories: [categorySchema],
    reviews: [reviewSchema],
    averageRating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    recapVideoUrl: { type: String, default: '' }
}, {
    timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
