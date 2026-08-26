const express = require('express');
const router = express.Router();
const podcastController = require('../controllers/podcast.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// Public routes
router.get('/seasons', podcastController.getAllSeasons);
router.get('/seasons/:id', podcastController.getSeasonById);
router.get('/episodes', podcastController.getAllEpisodes);
router.get('/platforms', podcastController.getPlatforms);
router.post('/episodes/:id/listen', podcastController.recordListen);
router.post('/seasons/:id/resources/download', podcastController.downloadResource);
router.post('/submit-form', podcastController.submitForm);

// Protected Admin routes
router.post('/seasons', protect, authorize('admin'), podcastController.createSeason);
router.put('/seasons/:id', protect, authorize('admin'), podcastController.updateSeason);
router.delete('/seasons/:id', protect, authorize('admin'), podcastController.deleteSeason);

router.post('/episodes', protect, authorize('admin'), podcastController.createEpisode);
router.put('/episodes/:id', protect, authorize('admin'), podcastController.updateEpisode);
router.delete('/episodes/:id', protect, authorize('admin'), podcastController.deleteEpisode);

router.post('/platforms', protect, authorize('admin'), podcastController.createPlatform);
router.put('/platforms/:id', protect, authorize('admin'), podcastController.updatePlatform);
router.delete('/platforms/:id', protect, authorize('admin'), podcastController.deletePlatform);

module.exports = router;

