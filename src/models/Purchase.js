const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    user: { type: String, required: true, default: "Guest User" },
    filmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Film', required: true },
    filmTitle: { type: String, required: true },
    type: { type: String, enum: ['Buy', 'Rent'], required: true },
    amount: { type: String, required: true },
    expiresAt: { type: Date, default: null } // null if Buy
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);
