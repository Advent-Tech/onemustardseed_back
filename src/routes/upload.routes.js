const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (e) {
        console.error('Failed to create uploads directory:', e);
    }
}

// Use memory storage to process uploads
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for high-res images, audio & trailers
    fileFilter: (req, file, cb) => {
        // Accept common media, documents, and assets
        cb(null, true);
    }
});

let gfsBucket = null;
const initGridFS = () => {
    try {
        if (mongoose.connection && mongoose.connection.db) {
            gfsBucket = new GridFSBucket(mongoose.connection.db, {
                bucketName: 'uploads'
            });
        }
    } catch (err) {
        console.warn('GridFSBucket initialization deferred:', err.message);
    }
};

if (mongoose.connection && mongoose.connection.readyState === 1) {
    initGridFS();
} else if (mongoose.connection) {
    mongoose.connection.on('open', initGridFS);
}

// Middleware wrapper to handle any form field name and catch Multer errors gracefully
const multerAnyMiddleware = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err) {
            console.error('Multer upload error:', err);
            return res.status(400).json({ 
                success: false, 
                message: err.message || 'File upload parsing failed' 
            });
        }
        next();
    });
};

// Universal Upload Route (accepts field 'file', 'image', 'thumbnail', etc.)
router.post('/', multerAnyMiddleware, async (req, res) => {
    try {
        const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        
        if (!file) {
            return res.status(400).json({ success: false, message: 'No file provided in form data' });
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const cleanName = (file.originalname || 'upload').replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${uniqueSuffix}-${cleanName}`;

        // 1. Always save to local persistent disk storage (mounted volume /app/uploads)
        try {
            const diskFilePath = path.join(uploadsDir, filename);
            fs.writeFileSync(diskFilePath, file.buffer);
        } catch (fsErr) {
            console.warn('Disk save warning:', fsErr.message);
        }

        // 2. Also stream to MongoDB GridFS if connected
        if (!gfsBucket && mongoose.connection && mongoose.connection.db) {
            initGridFS();
        }

        if (gfsBucket) {
            try {
                const uploadStream = gfsBucket.openUploadStream(filename, {
                    contentType: file.mimetype || 'application/octet-stream'
                });
                uploadStream.end(file.buffer);
            } catch (gridFsErr) {
                console.warn('GridFS save warning:', gridFsErr.message);
            }
        }

        const fileUrl = `/api/upload/file/${filename}`;

        return res.status(200).json({
            success: true,
            url: fileUrl,
            fileUrl: fileUrl,
            path: `/uploads/${filename}`,
            filename: filename,
            mimetype: file.mimetype,
            size: file.size
        });
    } catch (error) {
        console.error('Upload processing error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error while saving uploaded file' 
        });
    }
});

// GET route to retrieve and stream files from GridFS or local uploads disk
const serveFileHandler = async (req, res) => {
    try {
        const filename = req.params.filename;
        if (!filename) {
            return res.status(400).json({ success: false, message: 'Filename required' });
        }

        // 1. Check local disk first for fastest serving
        const localPath = path.join(uploadsDir, filename);
        if (fs.existsSync(localPath)) {
            return res.sendFile(localPath);
        }

        // 2. If not on disk, stream from GridFS
        if (!gfsBucket && mongoose.connection && mongoose.connection.db) {
            initGridFS();
        }

        if (gfsBucket) {
            const files = await gfsBucket.find({ filename }).toArray();
            if (files && files.length > 0) {
                const file = files[0];
                res.set('Content-Type', file.contentType || 'image/jpeg');
                res.set('Cache-Control', 'public, max-age=31536000');
                const downloadStream = gfsBucket.openDownloadStreamByName(filename);
                downloadStream.on('error', (streamErr) => {
                    if (!res.headersSent) res.status(404).json({ success: false, message: 'File stream error' });
                });
                return downloadStream.pipe(res);
            }
        }

        return res.status(404).json({ success: false, message: 'File not found' });
    } catch (err) {
        console.error('File retrieval error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Error retrieving file' });
        }
    }
};

router.get('/file/:filename', serveFileHandler);
router.get('/:filename', serveFileHandler);

module.exports = router;
