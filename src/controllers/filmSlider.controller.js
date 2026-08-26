const FilmSlider = require('../models/FilmSlider');

// Get all sliders (public)
exports.getSliders = async (req, res) => {
    try {
        const sliders = await FilmSlider.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
        res.status(200).json({ success: true, data: sliders });
    } catch (error) {
        console.error('Error fetching film sliders:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get all sliders for admin
exports.getAllSlidersAdmin = async (req, res) => {
    try {
        const sliders = await FilmSlider.find().sort({ order: 1, createdAt: -1 });
        res.status(200).json({ success: true, data: sliders });
    } catch (error) {
        console.error('Error fetching all film sliders:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Create a new slider
exports.createSlider = async (req, res) => {
    try {
        const newSlider = await FilmSlider.create(req.body);
        res.status(201).json({ success: true, data: newSlider });
    } catch (error) {
        console.error('Error creating slider:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update a slider
exports.updateSlider = async (req, res) => {
    try {
        const updatedSlider = await FilmSlider.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedSlider) {
            return res.status(404).json({ success: false, message: 'Slider not found' });
        }
        res.status(200).json({ success: true, data: updatedSlider });
    } catch (error) {
        console.error('Error updating slider:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete a slider
exports.deleteSlider = async (req, res) => {
    try {
        const slider = await FilmSlider.findByIdAndDelete(req.params.id);
        if (!slider) {
            return res.status(404).json({ success: false, message: 'Slider not found' });
        }
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.error('Error deleting slider:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
