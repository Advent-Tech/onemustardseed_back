exports.getAllResources = async (req, res) => {
    res.status(200).json({ success: true, message: 'Get all resources' });
};

exports.getResourceById = async (req, res) => {
    res.status(200).json({ success: true, message: `Get resource ${req.params.id}` });
};

exports.createResource = async (req, res) => {
    res.status(201).json({ success: true, message: 'Create a new resource' });
};

exports.updateResource = async (req, res) => {
    res.status(200).json({ success: true, message: `Update resource ${req.params.id}` });
};

exports.deleteResource = async (req, res) => {
    res.status(200).json({ success: true, message: `Delete resource ${req.params.id}` });
};
