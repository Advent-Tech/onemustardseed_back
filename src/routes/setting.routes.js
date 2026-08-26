const express = require('express');
const { getSettings, updateSetting } = require('../controllers/setting.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', getSettings);
router.post('/', protect, authorize('admin'), updateSetting);

module.exports = router;

