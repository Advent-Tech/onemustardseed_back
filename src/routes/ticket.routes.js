const express = require('express');
const { createTicket, getUserTickets, getAllTickets, checkInTicket, updateTicketStatus } = require('../controllers/ticket.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', protect, createTicket);
router.get('/my-tickets', protect, getUserTickets);
router.get('/', protect, authorize('admin'), getAllTickets);
router.put('/:id/checkin', protect, authorize('admin'), checkInTicket);
router.put('/:id/status', protect, authorize('admin'), updateTicketStatus);

module.exports = router;
