const Purchase = require('../models/Purchase');
const Film = require('../models/Film');

exports.getAllPurchases = async (req, res) => {
    try {
        const purchases = await Purchase.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: purchases.length, data: purchases });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createPurchase = async (req, res) => {
    try {
        const { filmId, type, amount, user, customExpiresAt } = req.body;
        
        const film = await Film.findById(filmId);
        if (!film) {
            return res.status(404).json({ success: false, message: 'Film not found' });
        }

        const expiresAt = type === 'Rent' ? (customExpiresAt ? new Date(customExpiresAt) : new Date(Date.now() + 48 * 60 * 60 * 1000)) : null;

        const purchase = await Purchase.create({
            user: user || "Guest User",
            filmId,
            filmTitle: film.title,
            type,
            amount,
            expiresAt
        });

        // Increment film purchase count
        film.purchases = (film.purchases || 0) + 1;
        await film.save();

        res.status(201).json({ success: true, data: purchase });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
