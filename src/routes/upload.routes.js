const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

const router = express.Router();

// Use memory storage for Vercel compatibility
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 4 * 1024 * 1024 }, // 4MB limit to stay under Vercel's 4.5MB payload limit
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype.startsWith('image/') || 
            file.mimetype.startsWith('audio/') || 
            file.mimetype.startsWith('video/') || 
            file.mimetype.startsWith('application/') || 
            file.mimetype.startsWith('text/')
        ) {
            cb(null, true);
        } else {
            cb(new Error('File type not supported'));
        }
    }
});

let gfsBucket;
const initGridFS = () => {
    if (mongoose.connection.db && !gfsBucket) {
        gfsBucket = new GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads'
        });
    }
};

if (mongoose.connection.readyState === 1) {
    initGridFS();
} else {
    mongoose.connection.once('open', initGridFS);
}

// Upload route
router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
    }
    
    if (!gfsBucket) {
        return res.status(500).json({ success: false, message: 'GridFS not initialized yet' });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + '-' + req.file.originalname.replace(/\s+/g, '-');

    // Create an upload stream to GridFS
    const uploadStream = gfsBucket.openUploadStream(filename, {
        contentType: req.file.mimetype
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', () => {
        const fileUrl = `/api/upload/file/${filename}`;
        res.status(200).json({ success: true, url: fileUrl });
    });

    uploadStream.on('error', (err) => {
        res.status(500).json({ success: false, message: 'Error uploading file to GridFS' });
    });
});

const path = require('path');
const fs = require('fs');

// GET route to retrieve a file from GridFS or local uploads
const serveFileHandler = async (req, res) => {
    try {
        const filename = req.params.filename;

        if (gfsBucket) {
            const files = await gfsBucket.find({ filename }).toArray();
            if (files && files.length > 0) {
                const file = files[0];
                res.set('Content-Type', file.contentType || 'image/jpeg');
                const downloadStream = gfsBucket.openDownloadStreamByName(filename);
                downloadStream.on('error', () => {
                    if (!res.headersSent) res.status(404).json({ success: false, message: 'File stream error' });
                });
                return downloadStream.pipe(res);
            }
        }

        // Fallback to local uploads directory
        const localPath = path.join(__dirname, '../../uploads', filename);
        if (fs.existsSync(localPath)) {
            return res.sendFile(localPath);
        }

        return res.status(404).json({ success: false, message: 'File not found' });
    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Error retrieving file' });
        }
    }
};

router.get('/file/:filename', serveFileHandler);
router.get('/:filename', serveFileHandler);

module.exports = router;
