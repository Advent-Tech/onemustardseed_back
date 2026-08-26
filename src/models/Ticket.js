const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
        type: mongoose.Schema.ObjectId,
        ref: 'Event',
        required: true
    },
    city: {
        type: String,
        required: true
    },
    showtimeId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Paid', 'Pending', 'Refunded', 'Cancelled'],
        default: 'Paid'
    },
    checkedIn: {
        type: Boolean,
        default: false
    },
    ticketId: {
        type: String,
        required: true,
        unique: true
    },
    pricePaid: {
        type: String,
        default: '0'
    },
    category: {
        type: String,
        default: 'General'
    },
    stripeSessionId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Ticket', ticketSchema);
