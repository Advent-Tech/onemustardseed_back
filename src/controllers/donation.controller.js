const Donation = require('../models/Donation');
const User = require('../models/User');

// Create a new donation
exports.createDonation = async (req, res) => {
    try {
        const { firstName, lastName, email, amount, type, campaignId, isLegacy } = req.body;
        
        // Let's normalize type
        const normalizedType = type === 'monthly' || type === 'Monthly' ? 'Monthly' : 
                               type === 'annual' || type === 'Annual' ? 'Annual' : 'One-time';

        const newDonation = new Donation({
            firstName,
            lastName,
            email,
            amount: Number(amount),
            type: normalizedType,
            campaignId: campaignId || null,
            isLegacy: !!isLegacy,
            status: 'Completed' // Assuming successful processing for now
        });

        await newDonation.save();

        if (campaignId) {
            const Campaign = require('../models/Campaign');
            await Campaign.findByIdAndUpdate(campaignId, {
                $inc: { raisedAmount: Number(amount) }
            });
        }

        res.status(201).json({ success: true, data: newDonation });
    } catch (error) {
        console.error('Error creating donation:', error);
        res.status(500).json({ success: false, message: 'Failed to process donation' });
    }
};

// Get all donations
exports.getDonations = async (req, res) => {
    try {
        const donations = await Donation.find().lean().sort({ createdAt: -1 });
        
        // Match with User model to check account creation date
        const donationsWithUser = await Promise.all(donations.map(async (d) => {
            const user = await User.findOne({ email: d.email }).select('createdAt role');
            return {
                ...d,
                accountCreatedAt: user ? user.createdAt : null,
                isRegisteredUser: !!user
            };
        }));

        res.status(200).json({ success: true, data: donationsWithUser });
    } catch (error) {
        console.error('Error fetching donations:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch donations' });
    }
};
