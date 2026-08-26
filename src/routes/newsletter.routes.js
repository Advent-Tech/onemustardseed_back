const express = require('express');
const router = express.Router();
const Newsletter = require('../models/Newsletter');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, authorize } = require('../middlewares/auth.middleware');

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/newsletter');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fieldSize: 50 * 1024 * 1024 } // 50MB limit to allow large base64 JSON payloads
});

// GET all newsletters
router.get('/', async (req, res) => {
  try {
    const newsletters = await Newsletter.find().sort({ createdAt: -1 });
    res.json(newsletters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single newsletter by id
router.get('/:id', async (req, res) => {
  try {
    const nl = await Newsletter.findById(req.params.id);
    if (!nl) return res.status(404).json({ message: 'Newsletter not found' });
    // Increment views
    nl.views = (nl.views || 0) + 1;
    await nl.save();
    res.json(nl);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create newsletter (with optional featured image upload)
router.post('/', protect, authorize('admin'), upload.fields([{ name: 'featuredImage', maxCount: 1 }]), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data || '{}');
    if (req.files?.featuredImage?.[0]) {
      data.featuredImage = `/uploads/newsletter/${req.files.featuredImage[0].filename}`;
    }
    const newsletter = new Newsletter(data);
    const saved = await newsletter.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update newsletter
router.put('/:id', protect, authorize('admin'), upload.fields([{ name: 'featuredImage', maxCount: 1 }]), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data || '{}');
    if (req.files?.featuredImage?.[0]) {
      data.featuredImage = `/uploads/newsletter/${req.files.featuredImage[0].filename}`;
    }
    const updated = await Newsletter.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!updated) return res.status(404).json({ message: 'Newsletter not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST upload a block image (returns url)
router.post('/upload/block-image', protect, authorize('admin'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ url: `/uploads/newsletter/${req.file.filename}` });
});

// POST add comment (public)
router.post('/:id/comments', async (req, res) => {
  try {
    const nl = await Newsletter.findById(req.params.id);
    if (!nl) return res.status(404).json({ message: 'Newsletter not found' });
    
    nl.comments = nl.comments || [];
    nl.comments.push({
      user: req.body.user || 'Anonymous',
      text: req.body.text
    });
    
    await nl.save();
    res.json(nl.comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update comment (admin)
router.put('/:id/comments/:commentId', protect, authorize('admin'), async (req, res) => {
  try {
    const nl = await Newsletter.findById(req.params.id);
    if (!nl) return res.status(404).json({ message: 'Newsletter not found' });
    
    const comment = nl.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    
    if (req.body.status !== undefined) comment.status = req.body.status;
    if (req.body.adminReply !== undefined) comment.adminReply = req.body.adminReply;
    
    await nl.save();
    res.json(nl.comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE comment (admin)
router.delete('/:id/comments/:commentId', protect, authorize('admin'), async (req, res) => {
  try {
    const nl = await Newsletter.findById(req.params.id);
    if (!nl) return res.status(404).json({ message: 'Newsletter not found' });
    
    nl.comments.pull(req.params.commentId);
    await nl.save();
    res.json(nl.comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE newsletter (admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Newsletter.findByIdAndDelete(req.params.id);
    res.json({ message: 'Newsletter deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

