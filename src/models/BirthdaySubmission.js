const mongoose = require('mongoose');

const BirthdaySubmissionSchema = new mongoose.Schema({
  parentName: { type: String, required: true, trim: true },
  parentEmail: { type: String, required: true, trim: true, lowercase: true },
  childName: { type: String, required: true, trim: true },
  childDob: { type: String, required: true },
  instructions: { type: String, default: '' },
  status: { type: String, enum: ['New', 'Contacted', 'Completed'], default: 'New' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BirthdaySubmission', BirthdaySubmissionSchema);
