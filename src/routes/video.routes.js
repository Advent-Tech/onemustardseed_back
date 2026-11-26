const express = require('express');
const router = express.Router();
const c = require('../controllers/video.controller');
const { protect, authorize, optionalAuth } = require('../middlewares/auth.middleware');

// ── Admin (must be declared before "/:id") ──
router.get('/admin', protect, authorize('admin'), c.listAdmin);
router.get('/admin/facets', protect, authorize('admin'), c.facetsAdmin);
router.get('/lookup', protect, authorize('admin'), c.lookup);
router.post('/bulk', protect, authorize('admin'), c.bulkCreate);
router.post('/bulk-action', protect, authorize('admin'), c.bulkAction);
router.post('/', protect, authorize('admin'), c.create);

// ── Public ──
router.get('/', optionalAuth, c.listPublic);
router.get('/facets', c.facetsPublic);
router.post('/:id/view', c.trackView);
router.get('/:id', optionalAuth, c.getOne);

// ── Admin by id ──
router.put('/:id', protect, authorize('admin'), c.update);
router.delete('/:id', protect, authorize('admin'), c.remove);

module.exports = router;
