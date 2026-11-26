const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Ensure local uploads directory exists
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (e) {
        console.error('Failed to create uploads directory:', e);
    }
}

/* ───────────────────────── Upload policy ─────────────────────────
 * Admins (valid admin token) may upload images, audio, video, documents.
 * Anonymous visitors (e.g. the podcast "Get Involved" form) may only upload a small
 * image / audio / short video, and only a few times per hour.
 * HTML, SVG, scripts and executables are never accepted: they would run on our own domain.
 */
const IMAGE = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
const AUDIO = ['.mp3', '.m4a', '.wav', '.ogg', '.aac', '.oga'];
const VIDEO = ['.mp4', '.mov', '.webm', '.m4v'];
const DOCS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.csv', '.txt', '.zip', '.epub'];

const ADMIN_EXT = new Set([...IMAGE, ...AUDIO, ...VIDEO, ...DOCS]);
const PUBLIC_EXT = new Set([...IMAGE.filter(e => e !== '.gif'), ...AUDIO, ...VIDEO]);

const ADMIN_MAX = 100 * 1024 * 1024; // 100 MB (long videos belong on Vimeo; paste the link instead)
const PUBLIC_MAX = 25 * 1024 * 1024; // 25 MB

const PUBLIC_LIMIT = 10;             // uploads
const PUBLIC_WINDOW = 60 * 60 * 1000; // per hour, per IP
const hits = new Map();
const rateLimited = (ip) => {
    const now = Date.now();
    const list = (hits.get(ip) || []).filter(t => now - t < PUBLIC_WINDOW);
    if (list.length >= PUBLIC_LIMIT) { hits.set(ip, list); return true; }
    list.push(now);
    hits.set(ip, list);
    return false;
};
setInterval(() => { // keep the map small
    const now = Date.now();
    for (const [ip, list] of hits) {
        const fresh = list.filter(t => now - t < PUBLIC_WINDOW);
        if (fresh.length) hits.set(ip, fresh); else hits.delete(ip);
    }
}, 10 * 60 * 1000).unref();

const getAdmin = async (req) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        return user && user.role === 'admin' ? user : null;
    } catch {
        return null;
    }
};

// Use memory storage to process uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: ADMIN_MAX, files: 1 },
});

let gfsBucket = null;
const initGridFS = () => {
    try {
        if (mongoose.connection && mongoose.connection.db) {
            gfsBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
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

// Decide who is uploading before accepting any bytes
const policy = async (req, res, next) => {
    const admin = await getAdmin(req);
    req.isAdminUpload = !!admin;
    if (!admin && rateLimited(req.ip)) {
        return res.status(429).json({ success: false, message: 'Too many uploads. Please try again later.' });
    }
    next();
};

const multerAnyMiddleware = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err) {
            console.error('Multer upload error:', err.message);
            return res.status(400).json({ success: false, message: err.message || 'File upload parsing failed' });
        }
        next();
    });
};

// Universal Upload Route (accepts field 'file', 'image', 'thumbnail', etc.)
router.post('/', policy, multerAnyMiddleware, async (req, res) => {
    try {
        const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        if (!file) {
            return res.status(400).json({ success: false, message: 'No file provided in form data' });
        }

        const ext = path.extname(file.originalname || '').toLowerCase();
        const allowed = req.isAdminUpload ? ADMIN_EXT : PUBLIC_EXT;
        if (!allowed.has(ext)) {
            return res.status(400).json({
                success: false,
                message: req.isAdminUpload
                    ? `Files of type "${ext || 'unknown'}" are not allowed. Allowed: images, audio, video (mp4, mov, webm), PDF/Office documents, zip.`
                    : 'Only images, audio and short video clips can be uploaded here.'
            });
        }
        if (!req.isAdminUpload && file.size > PUBLIC_MAX) {
            return res.status(413).json({ success: false, message: 'That file is too large. Please keep it under 25 MB.' });
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const base = path.basename(file.originalname || 'upload', ext).replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 80) || 'upload';
        const filename = `${uniqueSuffix}-${base}${ext}`;

        // 1. Save to local persistent disk storage (mounted volume /app/uploads)
        try {
            fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
        } catch (fsErr) {
            console.warn('Disk save warning:', fsErr.message);
        }

        // 2. Also stream to MongoDB GridFS if connected
        if (!gfsBucket && mongoose.connection && mongoose.connection.db) initGridFS();
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
        return res.status(500).json({ success: false, message: 'Server error while saving uploaded file' });
    }
});

// GET route to retrieve and stream files from GridFS or local uploads disk
const serveFileHandler = async (req, res) => {
    try {
        // SECURITY: only a bare file name is accepted ("../" tricks are stripped), and it must resolve inside uploads/
        const filename = path.basename(String(req.params.filename || ''));
        if (!filename || filename.startsWith('.')) {
            return res.status(400).json({ success: false, message: 'Filename required' });
        }
        const ext = path.extname(filename).toLowerCase();
        if (!ADMIN_EXT.has(ext)) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        res.set('X-Content-Type-Options', 'nosniff');
        const inline = [...IMAGE, ...AUDIO, ...VIDEO, '.pdf'].includes(ext);
        if (!inline) res.set('Content-Disposition', `attachment; filename="${filename}"`);

        // 1. Check local disk first for fastest serving
        const localPath = path.resolve(uploadsDir, filename);
        if (localPath.startsWith(uploadsDir + path.sep) && fs.existsSync(localPath)) {
            return res.sendFile(localPath);
        }

        // 2. If not on disk, stream from GridFS
        if (!gfsBucket && mongoose.connection && mongoose.connection.db) initGridFS();
        if (gfsBucket) {
            const files = await gfsBucket.find({ filename }).toArray();
            if (files && files.length > 0) {
                const file = files[0];
                res.set('Content-Type', file.contentType || 'application/octet-stream');
                res.set('Cache-Control', 'public, max-age=31536000');
                const downloadStream = gfsBucket.openDownloadStreamByName(filename);
                downloadStream.on('error', () => {
                    if (!res.headersSent) res.status(404).json({ success: false, message: 'File stream error' });
                });
                return downloadStream.pipe(res);
            }
        }

        return res.status(404).json({ success: false, message: 'File not found' });
    } catch (err) {
        console.error('File retrieval error:', err);
        if (!res.headersSent) res.status(500).json({ success: false, message: 'Error retrieving file' });
    }
};

router.get('/file/:filename', serveFileHandler);
router.get('/:filename', serveFileHandler);

module.exports = router;
