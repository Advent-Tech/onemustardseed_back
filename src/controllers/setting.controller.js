const Setting = require('../models/Setting');

exports.getSettings = async (req, res) => {
    try {
        const settings = await Setting.find();
        const settingsObj = {};
        settings.forEach(s => { settingsObj[s.key] = s.value; });
        res.status(200).json({ success: true, data: settingsObj });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateSetting = async (req, res) => {
    try {
        const { key, value } = req.body;
        
        let setting = await Setting.findOne({ key });
        if (setting) {
            setting.value = value;
            await setting.save();
        } else {
            setting = await Setting.create({ key, value });
        }

        res.status(200).json({ success: true, data: setting });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
