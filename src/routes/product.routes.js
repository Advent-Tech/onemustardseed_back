const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.route('/')
    .get(productController.getProducts)
    .post(protect, authorize('admin'), productController.createProduct);

router.route('/:id')
    .put(protect, authorize('admin'), productController.updateProduct)
    .delete(protect, authorize('admin'), productController.deleteProduct);

module.exports = router;

