const express = require('express');
const { getAllPurchases, createPurchase } = require('../controllers/purchase.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', protect, authorize('admin'), getAllPurchases);
router.post('/', protect, authorize('admin'), createPurchase);

module.exports = router;

