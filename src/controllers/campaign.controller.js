const Campaign = require('../models/Campaign');

exports.getCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find({ isActive: true }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: campaigns });
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
    }
};

exports.createCampaign = async (req, res) => {
    try {
        const campaign = new Campaign(req.body);
        await campaign.save();
        res.status(201).json({ success: true, data: campaign });
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({ success: false, message: 'Failed to create campaign' });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }
        res.status(200).json({ success: true, data: campaign });
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({ success: false, message: 'Failed to update campaign' });
    }
};

exports.deleteCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findByIdAndDelete(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }
        res.status(200).json({ success: true, message: 'Campaign deleted successfully' });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).json({ success: false, message: 'Failed to delete campaign' });
    }
};
