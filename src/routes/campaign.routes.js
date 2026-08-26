const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaign.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// Public routes
router.get('/', campaignController.getCampaigns);

// Protected Admin routes
router.post('/', protect, authorize('admin'), campaignController.createCampaign);
router.put('/:id', protect, authorize('admin'), campaignController.updateCampaign);
router.delete('/:id', protect, authorize('admin'), campaignController.deleteCampaign);

module.exports = router;

