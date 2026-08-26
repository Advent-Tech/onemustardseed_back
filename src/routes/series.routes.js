const express = require('express');
const { getAllSeries, getSeriesById, createSeries, updateSeries, deleteSeries } = require('../controllers/series.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', getAllSeries);
router.get('/:id', getSeriesById);

// Protected and admin only routes
router.post('/', protect, authorize('admin'), createSeries);
router.put('/:id', protect, authorize('admin'), updateSeries);
router.delete('/:id', protect, authorize('admin'), deleteSeries);

module.exports = router;
