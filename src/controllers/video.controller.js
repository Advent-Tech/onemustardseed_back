const mongoose = require('mongoose');
const Video = require('../models/Video');
const { parseVideoUrl, oembed } = require('../utils/videoUrl');

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const clean = (v) => (typeof v === 'string' ? v.trim() : v);
const toTags = (t) => {
    const arr = Array.isArray(t) ? t : String(t || '').split(/[,;|]/);
    return [...new Set(arr.map(x => String(x).trim()).filter(Boolean))].slice(0, 30);
};
const canWatchMembers = (req) => !!(req.user && (req.user.role === 'admin' || req.user.kidsAccessActive));

/** Hide the link on members-only videos for people without access. */
const shape = (doc, req) => {
    const o = doc.toObject ? doc.toObject() : doc;
    if (o.access === 'members' && !canWatchMembers(req)) {
        o.videoUrl = '';
        o.locked = true;
    }
    return o;
};

const buildFilter = (q, { admin = false } = {}) => {
    const f = {};
    if (!admin) f.status = 'Published';
    else if (q.status && q.status !== 'all') f.status = q.status;
    if (q.category && q.category !== 'All') f.category = q.category;
    if (q.show) f.show = q.show;
    if (q.tag) f.tags = q.tag;
    if (q.provider) f.provider = q.provider;
    if (q.featured === 'true') f.isFeatured = true;
    if (q.search && String(q.search).trim()) {
        const rx = new RegExp(esc(String(q.search).trim().slice(0, 80)), 'i');
        f.$or = [{ title: rx }, { description: rx }, { tags: rx }, { show: rx }, { category: rx }];
    }
    return f;
};

const SORTS = {
    newest: { publishedAt: -1, createdAt: -1 },
    oldest: { publishedAt: 1, createdAt: 1 },
    title: { title: 1 },
    views: { views: -1 },
    manual: { order: 1, createdAt: -1 },
    updated: { updatedAt: -1 },
};

const paginate = async (req, res, { admin }) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const max = admin ? 100 : 60;
    const limit = Math.min(max, Math.max(1, parseInt(req.query.limit, 10) || (admin ? 25 : 24)));
    const filter = buildFilter(req.query, { admin });
    const sort = SORTS[req.query.sort] || SORTS.newest;

    const [items, total] = await Promise.all([
        Video.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
        Video.countDocuments(filter),
    ]);
    const out = {
        success: true,
        data: admin ? items : items.map(v => shape(v, req)),
        page, limit, total, pages: Math.max(1, Math.ceil(total / limit)),
    };
    if (admin) {
        const counts = await Video.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
        out.counts = { Published: 0, Draft: 0, Archived: 0 };
        counts.forEach(c => { out.counts[c._id] = c.n; });
        out.counts.all = Object.values(out.counts).reduce((a, b) => a + b, 0);
    }
    res.status(200).json(out);
};

exports.listPublic = async (req, res) => {
    try { await paginate(req, res, { admin: false }); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
exports.listAdmin = async (req, res) => {
    try { await paginate(req, res, { admin: true }); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const facets = (match) => async (req, res) => {
    try {
        const [categories, shows, tags] = await Promise.all([
            Video.aggregate([{ $match: match }, { $group: { _id: '$category', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
            Video.aggregate([{ $match: { ...match, show: { $ne: '' } } }, { $group: { _id: '$show', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
            Video.aggregate([{ $match: match }, { $unwind: '$tags' }, { $group: { _id: '$tags', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 80 }]),
        ]);
        const fmt = (a) => a.filter(x => x._id).map(x => ({ name: x._id, count: x.n }));
        res.status(200).json({ success: true, data: { categories: fmt(categories), shows: fmt(shows), tags: fmt(tags) } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
exports.facetsPublic = facets({ status: 'Published' });
exports.facetsAdmin = facets({});

exports.getOne = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Video not found' });
        const v = await Video.findById(req.params.id);
        const isAdmin = req.user && req.user.role === 'admin';
        if (!v || (v.status !== 'Published' && !isAdmin)) return res.status(404).json({ success: false, message: 'Video not found' });

        const relatedFilter = { status: 'Published', _id: { $ne: v._id }, $or: [{ category: v.category }, ...(v.show ? [{ show: v.show }] : [])] };
        const related = await Video.find(relatedFilter).sort({ publishedAt: -1 }).limit(12);
        res.status(200).json({ success: true, data: shape(v, req), related: related.map(r => shape(r, req)) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.trackView = async (req, res) => {
    try {
        if (isId(req.params.id)) await Video.updateOne({ _id: req.params.id, status: 'Published' }, { $inc: { views: 1 } });
        res.status(200).json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

/** Turns raw input into a clean document body, or an error string. */
const prepare = (input) => {
    const parsed = parseVideoUrl(input.videoUrl);
    if (!parsed) return { error: 'Not a valid video link' };
    const title = clean(input.title);
    return {
        parsed,
        body: {
            title,
            description: clean(input.description) || '',
            videoUrl: parsed.url,
            provider: parsed.provider,
            externalId: parsed.externalId,
            thumbnail: clean(input.thumbnail) || '',
            duration: clean(input.duration) || '',
            category: clean(input.category) || 'General',
            show: clean(input.show) || '',
            season: clean(input.season) || '',
            episodeNumber: Number(input.episodeNumber) || 0,
            tags: toTags(input.tags),
            status: ['Draft', 'Published', 'Archived'].includes(input.status) ? input.status : 'Draft',
            access: input.access === 'members' ? 'members' : 'free',
            isFeatured: input.isFeatured === true || input.isFeatured === 'true',
            order: Number(input.order) || 0,
        },
    };
};

exports.create = async (req, res) => {
    try {
        const p = prepare(req.body);
        if (p.error) return res.status(400).json({ success: false, message: p.error });
        if (!p.body.title) return res.status(400).json({ success: false, message: 'Please add a title' });
        if (p.parsed.provider !== 'other') {
            const dup = await Video.findOne({ provider: p.parsed.provider, externalId: p.parsed.externalId });
            if (dup && req.body.allowDuplicate !== true) {
                return res.status(409).json({ success: false, message: `This video is already in the library as “${dup.title}”.`, existingId: dup._id });
            }
        }
        const v = await Video.create({ ...p.body, createdBy: req.user._id });
        res.status(201).json({ success: true, data: v });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

exports.update = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Video not found' });
        const v = await Video.findById(req.params.id);
        if (!v) return res.status(404).json({ success: false, message: 'Video not found' });
        const p = prepare({ ...v.toObject(), ...req.body });
        if (p.error) return res.status(400).json({ success: false, message: p.error });
        if (!p.body.title) return res.status(400).json({ success: false, message: 'Please add a title' });
        Object.assign(v, p.body);
        await v.save();
        res.status(200).json({ success: true, data: v });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Video not found' });
        const v = await Video.findByIdAndDelete(req.params.id);
        if (!v) return res.status(404).json({ success: false, message: 'Video not found' });
        res.status(200).json({ success: true, data: {} });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

/** Admin helper: paste a link, get the title / thumbnail / length filled in. */
exports.lookup = async (req, res) => {
    try {
        const parsed = parseVideoUrl(req.query.url);
        if (!parsed) return res.status(400).json({ success: false, message: 'Not a valid video link' });
        const info = await oembed(parsed);
        const dup = parsed.provider !== 'other' ? await Video.findOne({ provider: parsed.provider, externalId: parsed.externalId }).select('title') : null;
        res.status(200).json({ success: true, data: { ...parsed, info, duplicateOf: dup ? { id: dup._id, title: dup.title } : null } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// run `fn` over `items` with at most `n` in flight
const pool = async (items, n, fn) => {
    const out = new Array(items.length);
    let i = 0;
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
        while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
    }));
    return out;
};

/**
 * Bulk import. Body: { videos: [{ videoUrl, title?, category?, show?, tags?, ... }], autofill: true }
 * With autofill, a missing title / thumbnail / length is read from Vimeo or YouTube.
 * Send in batches of up to 50; the response says exactly which rows were skipped or failed and why.
 */
exports.bulkCreate = async (req, res) => {
    try {
        const rows = Array.isArray(req.body.videos) ? req.body.videos : [];
        if (!rows.length) return res.status(400).json({ success: false, message: 'No videos provided' });
        if (rows.length > 100) return res.status(400).json({ success: false, message: 'Please send at most 100 videos per request' });
        const autofill = req.body.autofill !== false;
        const defaults = req.body.defaults || {};

        const prepared = rows.map((r, idx) => {
            const merged = { ...defaults, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v !== '' && v != null)) };
            const p = prepare(merged);
            return { idx, row: r.row || idx + 1, input: merged, ...p };
        });

        // de-duplicate against the library and within this batch
        const seen = new Set();
        const keys = prepared.filter(p => p.parsed && p.parsed.provider !== 'other').map(p => ({ provider: p.parsed.provider, externalId: p.parsed.externalId }));
        const existing = keys.length ? await Video.find({ $or: keys }).select('provider externalId title') : [];
        const existsSet = new Map(existing.map(e => [`${e.provider}:${e.externalId}`, e.title]));

        const skipped = [], failed = [], todo = [];
        for (const p of prepared) {
            if (p.error) { failed.push({ row: p.row, reason: p.error, videoUrl: p.input.videoUrl }); continue; }
            const key = `${p.parsed.provider}:${p.parsed.externalId}`;
            if (p.parsed.provider !== 'other') {
                if (existsSet.has(key)) { skipped.push({ row: p.row, reason: `Already in library: “${existsSet.get(key)}”`, videoUrl: p.input.videoUrl }); continue; }
                if (seen.has(key)) { skipped.push({ row: p.row, reason: 'Repeated in this file', videoUrl: p.input.videoUrl }); continue; }
                seen.add(key);
            }
            todo.push(p);
        }

        if (autofill) {
            await pool(todo, 4, async (p) => {
                if (p.body.title && p.body.thumbnail && p.body.duration) return;
                const info = await oembed(p.parsed);
                if (info && !info.error) {
                    if (!p.body.title) p.body.title = info.title;
                    if (!p.body.thumbnail) p.body.thumbnail = info.thumbnail;
                    if (!p.body.duration) { p.body.duration = info.duration; p.body.durationSeconds = info.durationSeconds; }
                    if (!p.body.description) p.body.description = (info.description || '').slice(0, 5000);
                }
            });
        }

        const docs = [];
        for (const p of todo) {
            if (!p.body.title) { failed.push({ row: p.row, reason: 'No title (and none could be read from the video site)', videoUrl: p.input.videoUrl }); continue; }
            docs.push({ ...p.body, createdBy: req.user._id, publishedAt: p.body.status === 'Published' ? new Date() : undefined });
        }
        const created = docs.length ? await Video.insertMany(docs, { ordered: false }) : [];
        res.status(201).json({ success: true, created: created.length, skipped, failed });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

/** Act on many videos at once: publish, unpublish, archive, delete, feature, change category/show, add a tag. */
exports.bulkAction = async (req, res) => {
    try {
        const { ids, action, value } = req.body;
        if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ success: false, message: 'No videos selected' });
        if (ids.length > 1000) return res.status(400).json({ success: false, message: 'Select at most 1000 videos at a time' });
        const _ids = ids.filter(isId);
        const filter = { _id: { $in: _ids } };
        let result;
        switch (action) {
            case 'publish':
                await Video.updateMany({ ...filter, publishedAt: { $exists: false } }, { $set: { publishedAt: new Date() } });
                result = await Video.updateMany(filter, { $set: { status: 'Published' } }); break;
            case 'unpublish': result = await Video.updateMany(filter, { $set: { status: 'Draft' } }); break;
            case 'archive': result = await Video.updateMany(filter, { $set: { status: 'Archived' } }); break;
            case 'feature': result = await Video.updateMany(filter, { $set: { isFeatured: true } }); break;
            case 'unfeature': result = await Video.updateMany(filter, { $set: { isFeatured: false } }); break;
            case 'set-category':
                if (!clean(value)) return res.status(400).json({ success: false, message: 'Choose a category' });
                result = await Video.updateMany(filter, { $set: { category: clean(value) } }); break;
            case 'set-show': result = await Video.updateMany(filter, { $set: { show: clean(value) || '' } }); break;
            case 'set-access': result = await Video.updateMany(filter, { $set: { access: value === 'members' ? 'members' : 'free' } }); break;
            case 'add-tag':
                if (!clean(value)) return res.status(400).json({ success: false, message: 'Type a tag' });
                result = await Video.updateMany(filter, { $addToSet: { tags: clean(value) } }); break;
            case 'delete': result = await Video.deleteMany(filter); break;
            default: return res.status(400).json({ success: false, message: 'Unknown action' });
        }
        res.status(200).json({ success: true, affected: result.modifiedCount ?? result.deletedCount ?? 0 });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};
