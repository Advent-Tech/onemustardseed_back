const express = require('express');
const router = express.Router();
const kidsController = require('../controllers/kidsController');
const { protect, authorize, optionalAuth } = require('../middlewares/auth.middleware');

// ─── PUBLIC ROUTES ───────────────────────────────────────────────────────────

// Series (public metadata — no media links exposed)
router.get('/series', optionalAuth, kidsController.getAllSeries);
router.get('/series/:id', optionalAuth, kidsController.getSeriesById);

// Episodes (public — series metadata only, media links visible but access enforced on FE)
router.get('/series/:seriesId/episodes', optionalAuth, kidsController.getEpisodesBySeries);

// View Tracking (public so any play counts)
router.post('/episodes/:episodeId/view', kidsController.trackEpisodeView);
router.get('/series/:id/views', kidsController.getSeriesViews);

// Settings / Plan Info
router.get('/settings', kidsController.getKidsSettings);
router.get('/plans', kidsController.getPlanSettings);

// Sample Guide Download
router.get('/sample-guide', kidsController.downloadSampleGuide);

// ─── PROTECTED USER ROUTES ───────────────────────────────────────────────────

// Check if current user has Kids access
router.get('/access', protect, kidsController.checkAccess);

// Purchase / subscribe (called after payment success)
router.post('/purchase', protect, kidsController.createPurchase);

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

// Series CRUD (admin)
router.post('/series', protect, authorize('admin'), kidsController.createSeries);
router.put('/series/:id', protect, authorize('admin'), kidsController.updateSeries);
router.delete('/series/:id', protect, authorize('admin'), kidsController.deleteSeries);

// Episodes CRUD (admin)
router.post('/series/:seriesId/episodes', protect, authorize('admin'), kidsController.createEpisode);
router.put('/episodes/:episodeId', protect, authorize('admin'), kidsController.updateEpisode);
router.delete('/episodes/:episodeId', protect, authorize('admin'), kidsController.deleteEpisode);

// Analytics (admin)
router.get('/analytics', protect, authorize('admin'), kidsController.getAnalytics);

// Settings (admin)
router.post('/settings', protect, authorize('admin'), kidsController.updateKidsSettings);
router.post('/plans', protect, authorize('admin'), kidsController.updatePlanSettings);

// Purchase management (admin)
router.get('/purchases', protect, authorize('admin'), kidsController.getAllPurchases);
router.post('/grant-access', protect, authorize('admin'), kidsController.grantAccess);
router.delete('/purchases/:id', protect, authorize('admin'), kidsController.revokeAccess);

module.exports = router;
