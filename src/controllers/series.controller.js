exports.getAllSeries = async (req, res) => {
    res.status(200).json({ success: true, message: 'Get all series' });
};

exports.getSeriesById = async (req, res) => {
    res.status(200).json({ success: true, message: `Get series ${req.params.id}` });
};

exports.createSeries = async (req, res) => {
    res.status(201).json({ success: true, message: 'Create a new series' });
};

exports.updateSeries = async (req, res) => {
    res.status(200).json({ success: true, message: `Update series ${req.params.id}` });
};

exports.deleteSeries = async (req, res) => {
    res.status(200).json({ success: true, message: `Delete series ${req.params.id}` });
};

