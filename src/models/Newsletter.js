const mongoose = require('mongoose');

const BlockSchema = new mongoose.Schema({
  type: { type: String, enum: ['text', 'photo', 'video', 'news'], required: true },
  // text block
  content: { type: String },
  // photo block
  url: { type: String },
  caption: { type: String },
  // video block
  vimeoUrl: { type: String },
  videoTitle: { type: String },
  videoDescription: { type: String },
  // news block
  title: { type: String },
  excerpt: { type: String },
  link: { type: String },
}, { _id: true });

const CommentSchema = new mongoose.Schema({
  user: { type: String, required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminReply: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const NewsletterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, default: 'Ministry Update' },
  featuredImage: { type: String },
  date: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' },
  author: { type: String, default: 'OMS Team' },
  views: { type: Number, default: 0 },
  blocks: [BlockSchema],
  comments: [CommentSchema],
}, { timestamps: true });

module.exports = mongoose.model('Newsletter', NewsletterSchema);
