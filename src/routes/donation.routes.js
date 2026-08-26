const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donation.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.post('/', donationController.createDonation);
router.get('/', protect, authorize('admin'), donationController.getDonations);

module.exports = router;

