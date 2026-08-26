const express = require('express');
const { getAllFilms, getFilmById, createFilm, updateFilm, deleteFilm, addReview } = require('../controllers/film.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', getAllFilms);
router.get('/:id', getFilmById);
router.post('/:id/reviews', addReview); // Public route for reviews

// Protected and admin only routes
router.post('/', protect, authorize('admin'), createFilm);
router.put('/:id', protect, authorize('admin'), updateFilm);
router.delete('/:id', protect, authorize('admin'), deleteFilm);

module.exports = router;
