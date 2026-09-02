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

// POST subscribe to newsletter / e-book (public)
const Subscriber = require('../models/Subscriber');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

router.post('/subscribe', async (req, res) => {
  try {
    const { email, list, source } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const existing = await Subscriber.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.json({ success: true, message: 'You are already subscribed!' });
    }

    const subscriber = await Subscriber.create({
      email,
      list: list || 'General Newsletter',
      source: source || 'Website'
    });

    // If free e-book signup, notify angelisse@onemustardseed.com
    if ((list || '').toLowerCase().includes('book')) {
      try {
        await resend.emails.send({
          from: 'OMS Free Book Offer <onboarding@resend.dev>',
          to: 'angelisse@onemustardseed.com',
          replyTo: email,
          subject: `New Free E-Book Request: ${email}`,
          html: `
            <div style="font-family:sans-serif;padding:20px;background:#FAF7EE;color:#1a2f24;">
              <h2 style="color:#D4AF37;">New Free E-Book Request</h2>
              <p>A visitor requested the free Firewalkers e-book:</p>
              <p><strong>Subscriber Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>List / Campaign:</strong> ${list}</p>
            </div>
          `
        });
      } catch (e) {
        console.error("Free Book Lead Email Error:", e.message);
      }
    }

    res.status(201).json({ success: true, message: 'Thank you for subscribing!', data: subscriber });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET all subscribers (admin)
router.get('/subscribers/list', protect, authorize('admin'), async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.json({ success: true, data: subscribers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;


