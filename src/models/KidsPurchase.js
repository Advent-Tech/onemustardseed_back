const mongoose = require('mongoose');

const kidsPurchaseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null, // null for admin-granted access
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    plan: {
        type: String,
        enum: ['lifetime', 'monthly', 'yearly'],
        required: true,
    },
    amount: { type: String, required: true }, // e.g. "$99.00"
    status: {
        type: String,
        enum: ['active', 'expired', 'revoked', 'pending'],
        default: 'active',
    },
    source: {
        type: String,
        enum: ['stripe', 'admin_grant', 'promo_code'],
        default: 'stripe',
    },
    stripeSessionId: { type: String, default: null },
    purchasedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null }, // null = lifetime (never expires)
    notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('KidsPurchase', kidsPurchaseSchema);
