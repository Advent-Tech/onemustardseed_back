const PromoCode = require('../models/PromoCode');

// Create Promo Code
exports.createPromoCode = async (req, res) => {
    try {
        const { code, discountPercentage, maxUses } = req.body;
        const newPromo = await PromoCode.create({
            code: code.toUpperCase(),
            discountPercentage,
            maxUses
        });
        res.status(201).json({ success: true, data: newPromo });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get All Promo Codes
exports.getAllPromoCodes = async (req, res) => {
    try {
        const promoCodes = await PromoCode.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: promoCodes });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Validate Promo Code
exports.validatePromoCode = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Code is required' });
        }

        const promo = await PromoCode.findOne({ code: code.toUpperCase() });

        if (!promo) {
            return res.status(404).json({ success: false, message: 'Invalid promo code' });
        }

        if (!promo.isActive) {
            return res.status(400).json({ success: false, message: 'Promo code is inactive' });
        }

        if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
            return res.status(400).json({ success: false, message: 'Promo code limit reached' });
        }

        res.status(200).json({
            success: true,
            data: {
                discountPercentage: promo.discountPercentage
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Delete Promo Code
exports.deletePromoCode = async (req, res) => {
    try {
        await PromoCode.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Promo code deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
