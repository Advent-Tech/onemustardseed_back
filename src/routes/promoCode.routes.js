const express = require('express');
const router = express.Router();
const promoCodeController = require('../controllers/promoCode.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.post('/validate', promoCodeController.validatePromoCode);
router.get('/', protect, authorize('admin'), promoCodeController.getAllPromoCodes);
router.post('/', protect, authorize('admin'), promoCodeController.createPromoCode);
router.delete('/:id', protect, authorize('admin'), promoCodeController.deletePromoCode);

module.exports = router;
