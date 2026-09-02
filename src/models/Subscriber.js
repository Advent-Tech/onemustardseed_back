const mongoose = require('mongoose');

const SubscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true },
  list: { type: String, default: 'General Newsletter' },
  source: { type: String, default: 'Website' },
  status: { type: String, enum: ['Active', 'Unsubscribed'], default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Subscriber', SubscriberSchema);
