const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'General' },
  featuredImage: { type: String }, // Can be base64 or URL
  fileUrl: { type: String, required: true }, // The URL to the actual free resource (PDF, etc)
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  downloadsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Resource', resourceSchema);
