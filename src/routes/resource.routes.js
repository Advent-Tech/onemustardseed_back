const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const Lead = require('../models/Lead');
const { Resend } = require('resend');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { protect, authorize } = require('../middlewares/auth.middleware');

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to save base64 to GridFS
async function saveToGridFS(base64String, filename, contentType) {
  return new Promise((resolve, reject) => {
    try {
      const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'resources' });
      const parts = base64String.split(',');
      const base64Data = parts.length > 1 ? parts[1] : parts[0];
      const buffer = Buffer.from(base64Data, 'base64');
      
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: contentType
      });
      
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => {
        resolve(uploadStream.id.toString());
      });
      
      uploadStream.end(buffer);
    } catch (err) {
      reject(err);
    }
  });
}

// GET serve file from GridFS
router.get('/files/:id', async (req, res) => {
  try {
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'resources' });
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    res.set('Content-Type', files[0].contentType);
    res.set('Content-Disposition', `attachment; filename="${files[0].filename}"`);
    res.set('Cache-Control', 'public, max-age=31536000');
    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all resources (public)
router.get('/', async (req, res) => {
  try {
    const resources = await Resource.find().sort({ createdAt: -1 });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create resource (admin)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const payload = { ...req.body };
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (payload.fileUrl && payload.fileUrl.startsWith('data:')) {
      const contentType = payload.fileUrl.substring(5, payload.fileUrl.indexOf(';'));
      const ext = contentType === 'application/pdf' ? '.pdf' : '.file';
      const fileId = await saveToGridFS(payload.fileUrl, `${payload.title}-file${ext}`, contentType);
      payload.fileUrl = `${baseUrl}/api/resources/files/${fileId}`;
    }

    if (payload.featuredImage && payload.featuredImage.startsWith('data:')) {
      const contentType = payload.featuredImage.substring(5, payload.featuredImage.indexOf(';'));
      const ext = contentType.includes('/') ? `.${contentType.split('/')[1]}` : '.jpg';
      const fileId = await saveToGridFS(payload.featuredImage, `${payload.title}-image${ext}`, contentType);
      payload.featuredImage = `${baseUrl}/api/resources/files/${fileId}`;
    }

    const resource = new Resource(payload);
    const saved = await resource.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Resource Upload Error:", err);
    res.status(400).json({ message: err.message });
  }
});

// PUT update resource (admin)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const payload = { ...req.body };
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (payload.fileUrl && payload.fileUrl.startsWith('data:')) {
      const contentType = payload.fileUrl.substring(5, payload.fileUrl.indexOf(';'));
      const ext = contentType === 'application/pdf' ? '.pdf' : '.file';
      const fileId = await saveToGridFS(payload.fileUrl, `${payload.title || 'updated'}-file${ext}`, contentType);
      payload.fileUrl = `${baseUrl}/api/resources/files/${fileId}`;
    }

    if (payload.featuredImage && payload.featuredImage.startsWith('data:')) {
      const contentType = payload.featuredImage.substring(5, payload.featuredImage.indexOf(';'));
      const ext = contentType.includes('/') ? `.${contentType.split('/')[1]}` : '.jpg';
      const fileId = await saveToGridFS(payload.featuredImage, `${payload.title || 'updated'}-image${ext}`, contentType);
      payload.featuredImage = `${baseUrl}/api/resources/files/${fileId}`;
    }

    const updated = await Resource.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!updated) return res.status(404).json({ message: 'Resource not found' });
    res.json(updated);
  } catch (err) {
    console.error("Resource Update Error:", err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE resource (admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.json({ message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all leads (for admin)
router.get('/leads/all', protect, authorize('admin'), async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {

    res.status(500).json({ message: err.message });
  }
});

// POST capture lead & send resource
router.post('/download/:id', async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource || !resource.isActive) {
      return res.status(404).json({ message: 'Resource not found or inactive' });
    }

    const { name, email, phone } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Save lead
    const lead = new Lead({
      name,
      email,
      phone,
      resourceId: resource._id,
      resourceTitle: resource.title
    });
    await lead.save();

    // Increment downloads
    resource.downloadsCount += 1;
    await resource.save();

    // Send email using Resend
    try {
      await resend.emails.send({
        from: 'One Mustard Seed <onboarding@resend.dev>',
        to: email, 
        subject: `Your Free Resource: ${resource.title}`,
        html: `
          <div style="font-family: sans-serif; max-w-xl; margin: 0 auto; color: #1a2f24;">
            <h2>Hi ${name},</h2>
            <p>Thank you for your interest! Here is your free resource: <strong>${resource.title}</strong>.</p>
            <p><a href="${resource.fileUrl}" style="display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #1a2f24; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px; margin-bottom: 20px;">Download Resource</a></p>
            <p style="font-size: 14px; color: #666;">If the button doesn't work, copy and paste this link into your browser: <br/><a href="${resource.fileUrl}">${resource.fileUrl}</a></p>
            <p>Blessings,<br/>The One Mustard Seed Team</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error("Resend Email Error:", emailErr);
    }

    res.json({ message: 'Success', fileUrl: resource.fileUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
