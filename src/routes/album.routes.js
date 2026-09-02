const express = require('express');
const router = express.Router();
const Album = require('../models/Album');
const { protect, authorize } = require('../middlewares/auth.middleware');

const DEFAULT_ALBUMS = [
  {
    title: "Deborah",
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=800&fit=crop",
    description: "The courageous story of Deborah, brought to life through dynamic beats and uplifting melodies.",
    status: "Active",
    songs: Array.from({ length: 10 }, (_, i) => ({ title: `Song of Deborah Track ${i + 1}`, duration: "3:45" }))
  },
  {
    title: "Abraham",
    cover: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&h=800&fit=crop",
    description: "Follow the father of faith on his incredible journey, with songs that inspire trust and obedience.",
    status: "Active",
    songs: Array.from({ length: 12 }, (_, i) => ({ title: `Journey to the Promise Track ${i + 1}`, duration: "4:10" }))
  },
  {
    title: "Samuel",
    cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&h=800&fit=crop",
    description: "Hear the call of Samuel in this beautiful collection of worship and listening to God's voice.",
    status: "Active",
    songs: Array.from({ length: 9 }, (_, i) => ({ title: `Here I Am Track ${i + 1}`, duration: "2:55" }))
  },
  {
    title: "Abigail",
    cover: "https://images.unsplash.com/photo-1493225457124-a1a2a5f5291b?w=800&h=800&fit=crop",
    description: "A musical exploration of wisdom, peace, and stepping in to do what is right.",
    status: "Active",
    songs: Array.from({ length: 8 }, (_, i) => ({ title: `Wisdom and Peace Track ${i + 1}`, duration: "3:20" }))
  },
  {
    title: "Zacchaeus",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=800&fit=crop",
    description: "Come down from the tree and dance to the story of a changed heart and grace.",
    status: "Active",
    songs: Array.from({ length: 14 }, (_, i) => ({ title: `Come Down Track ${i + 1}`, duration: "3:15" }))
  },
  {
    title: "Titus",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=800&fit=crop",
    description: "Sound doctrine made fun! Catchy tunes that teach foundational truths to young minds.",
    status: "Active",
    songs: Array.from({ length: 11 }, (_, i) => ({ title: `Sound Doctrine Track ${i + 1}`, duration: "4:00" }))
  },
  {
    title: "Joshua",
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=800&fit=crop",
    description: "Be strong and courageous with anthems of victory, marching, and crossing over into the promise.",
    status: "Active",
    songs: Array.from({ length: 10 }, (_, i) => ({ title: `Be Strong Track ${i + 1}`, duration: "3:50" }))
  }
];

// GET all albums (auto-seeds defaults if empty)
router.get('/', async (req, res) => {
  try {
    let albums = await Album.find().sort({ createdAt: 1 });
    if (albums.length === 0) {
      await Album.insertMany(DEFAULT_ALBUMS);
      albums = await Album.find().sort({ createdAt: 1 });
    }
    res.json({ success: true, data: albums });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single album
router.get('/:id', async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: 'Album not found' });
    res.json({ success: true, data: album });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create album
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, description, cover, status, songs } = req.body;
    const album = new Album({
      title,
      description,
      cover,
      status: status || 'Active',
      songs: songs || []
    });
    const saved = await album.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update album
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, description, cover, status, songs } = req.body;
    const updated = await Album.findByIdAndUpdate(
      req.params.id,
      { title, description, cover, status, songs },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Album not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE album
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const deleted = await Album.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Album not found' });
    res.json({ success: true, message: 'Album deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
