const express = require('express');
const router = express.Router();
const filmSliderController = require('../controllers/filmSlider.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.get('/', filmSliderController.getSliders);
router.get('/admin', protect, authorize('admin'), filmSliderController.getAllSlidersAdmin);
router.post('/', protect, authorize('admin'), filmSliderController.createSlider);
router.put('/:id', protect, authorize('admin'), filmSliderController.updateSlider);
router.delete('/:id', protect, authorize('admin'), filmSliderController.deleteSlider);

module.exports = router;

