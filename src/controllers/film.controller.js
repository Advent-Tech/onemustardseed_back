const Film = require('../models/Film');

exports.getAllFilms = async (req, res) => {
    try {
        const films = await Film.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: films.length, data: films });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const mongoose = require('mongoose');

exports.getFilmById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Film not found' });
        }
        const film = await Film.findById(req.params.id);
        if (!film) {
            return res.status(404).json({ success: false, message: 'Film not found' });
        }
        res.status(200).json({ success: true, data: film });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createFilm = async (req, res) => {
    try {
        const film = await Film.create(req.body);
        res.status(201).json({ success: true, data: film });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateFilm = async (req, res) => {
    try {
        const film = await Film.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!film) {
            return res.status(404).json({ success: false, message: 'Film not found' });
        }
        res.status(200).json({ success: true, data: film });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteFilm = async (req, res) => {
    try {
        const film = await Film.findByIdAndDelete(req.params.id);
        if (!film) {
            return res.status(404).json({ success: false, message: 'Film not found' });
        }
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addReview = async (req, res) => {
    try {
        const { text, rating, user } = req.body;
        const film = await Film.findById(req.params.id);
        
        if (!film) {
            return res.status(404).json({ success: false, message: 'Film not found' });
        }

        const review = {
            user: user || 'Guest User',
            text,
            rating: Number(rating)
        };

        film.reviews.unshift(review); // Add to beginning of array

        // Update overall rating
        const totalRating = film.reviews.reduce((acc, item) => item.rating + acc, 0);
        film.rating = (totalRating / film.reviews.length).toFixed(1);

        await film.save();

        res.status(201).json({ success: true, data: film });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
