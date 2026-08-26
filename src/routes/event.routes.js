const express = require('express');
const { getAllEvents, getEventById, createEvent, updateEvent, deleteEvent, addEventReview } = require('../controllers/event.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.post('/:id/reviews', protect, addEventReview);

// Protected and admin only routes
router.post('/', protect, authorize('admin'), createEvent);
router.put('/:id', protect, authorize('admin'), updateEvent);
router.delete('/:id', protect, authorize('admin'), deleteEvent);

module.exports = router;
