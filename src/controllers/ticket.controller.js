const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const PromoCode = require('../models/PromoCode');

exports.createTicket = async (req, res) => {
    try {
        const { eventId, city, showtimeId, price, categoryName, quantity, promoCode } = req.body;
        
        // Find the event
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        let ticketPrice = event.price;
        let selectedCategory = null;
        let numTickets = quantity ? parseInt(quantity) : 1;


        if (categoryName && event.categories && event.categories.length > 0) {
            selectedCategory = event.categories.find(c => c.name === categoryName);
            if (!selectedCategory) {
                return res.status(400).json({ success: false, message: 'Invalid category selected' });
            }
            if (selectedCategory.available < numTickets) {
                return res.status(400).json({ success: false, message: 'Not enough tickets available in this category' });
            }
            ticketPrice = parseFloat(selectedCategory.price) || 0;
        } else {
            ticketPrice = parseFloat(ticketPrice.toString().replace(/[^0-9.]/g, '')) || 0;
            if (event.capacity && (event.capacity - event.ticketsSold) < numTickets) {
                return res.status(400).json({ success: false, message: 'Not enough tickets available' });
            }
        }

        let appliedPromo = null;
        if (promoCode) {
            appliedPromo = await PromoCode.findOne({ code: promoCode.toUpperCase() });
            if (appliedPromo && appliedPromo.isActive && (appliedPromo.maxUses === 0 || appliedPromo.usedCount < appliedPromo.maxUses)) {
                ticketPrice = ticketPrice - (ticketPrice * (appliedPromo.discountPercentage / 100));
            } else {
                return res.status(400).json({ success: false, message: 'Invalid or expired promo code' });
            }
        }

        const ticketsToCreate = [];

        for (let i = 0; i < numTickets; i++) {
            // Generate a unique ticket ID
            const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}-${i}`;
            ticketsToCreate.push({
                user: req.user.id,
                event: eventId,
                city,
                showtimeId,
                ticketId,
                pricePaid: ticketPrice.toString(),
                status: 'Paid',
                category: categoryName || 'General'
            });
        }

        // Create the tickets
        const createdTickets = await Ticket.insertMany(ticketsToCreate);

        // Increment tickets sold on the event and update category available
        event.ticketsSold += numTickets;
        if (selectedCategory) {
            selectedCategory.available -= numTickets;
        }
        await event.save();

        if (appliedPromo) {
            appliedPromo.usedCount += 1;
            await appliedPromo.save();
        }

        res.status(201).json({ success: true, data: createdTickets[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getUserTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ user: req.user.id }).populate('event', 'name date image location');
        res.status(200).json({ success: true, count: tickets.length, data: tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find().populate('user', 'name email').populate('event', 'name');
        res.status(200).json({ success: true, count: tickets.length, data: tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.checkInTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }
        
        ticket.checkedIn = true;
        await ticket.save();
        
        res.status(200).json({ success: true, data: ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateTicketStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Paid', 'Pending', 'Refunded', 'Cancelled'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        const oldStatus = ticket.status;
        ticket.status = status;
        await ticket.save();

        if (oldStatus === 'Paid' && ['Cancelled', 'Refunded'].includes(status)) {
            const event = await Event.findById(ticket.event);
            if (event) {
                event.ticketsSold = Math.max(0, event.ticketsSold - 1);
                if (event.categories) {
                    const cat = event.categories.find(c => c.name === ticket.category);
                    if (cat) cat.available += 1;
                }
                await event.save();
            }
        }
        
        res.status(200).json({ success: true, data: ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
