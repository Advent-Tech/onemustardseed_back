const express = require('express');
const router = express.Router();
const PrayerSeason = require('../models/PrayerSeason');
const PrayerEpisode = require('../models/PrayerEpisode');
const PrayerAccess = require('../models/PrayerAccess');
const { protect, authorize } = require('../middlewares/auth.middleware');

// --- SEASONS ---

router.get('/seasons', async (req, res) => {
    try {
        const seasons = await PrayerSeason.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: seasons });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.post('/seasons', protect, authorize('admin'), async (req, res) => {
    try {
        const season = await PrayerSeason.create(req.body);
        res.status(201).json({ success: true, data: season });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.get('/seasons/:id', async (req, res) => {
    try {
        const season = await PrayerSeason.findById(req.params.id);
        res.status(200).json({ success: true, data: season });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.put('/seasons/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const season = await PrayerSeason.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: season });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.delete('/seasons/:id', protect, authorize('admin'), async (req, res) => {
    try {
        await PrayerSeason.findByIdAndDelete(req.params.id);
        await PrayerEpisode.deleteMany({ seasonId: req.params.id });
        res.status(200).json({ success: true, message: 'Season deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});


// --- EPISODES ---

router.get('/seasons/:seasonId/episodes', async (req, res) => {
    try {
        const episodes = await PrayerEpisode.find({ seasonId: req.params.seasonId }).sort({ day: 1 });
        res.status(200).json({ success: true, data: episodes });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.post('/seasons/:seasonId/episodes', protect, authorize('admin'), async (req, res) => {
    try {
        const episode = await PrayerEpisode.create({ ...req.body, seasonId: req.params.seasonId });
        res.status(201).json({ success: true, data: episode });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
});

router.put('/episodes/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const episode = await PrayerEpisode.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: episode });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
});

router.delete('/episodes/:id', protect, authorize('admin'), async (req, res) => {
    try {
        await PrayerEpisode.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Episode deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// --- ACCESS ---

router.get('/users', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await PrayerAccess.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.post('/users', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await PrayerAccess.create(req.body);
        res.status(201).json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
});

router.put('/users/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await PrayerAccess.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;

