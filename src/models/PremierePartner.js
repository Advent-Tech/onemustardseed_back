const mongoose = require('mongoose');

const PremierePartnerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, default: '' },
  church: { type: String, required: true, trim: true },
  newsletter: { type: String, default: 'No' },
  status: { type: String, enum: ['New', 'Contacted', 'Approved'], default: 'New' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PremierePartner', PremierePartnerSchema);
