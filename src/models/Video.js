const mongoose = require('mongoose');

/**
 * Video Library — one record per video resource (Vimeo / YouTube / uploaded file).
 * Built for 500+ items: indexed, searchable, filterable, importable in bulk.
 */
const videoSchema = new mongoose.Schema({
    title: { type: String, required: [true, 'Please add a title'], trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 5000 },
    videoUrl: { type: String, required: [true, 'Please add the video link'], trim: true },
    provider: { type: String, enum: ['vimeo', 'youtube', 'file', 'other'], default: 'other', index: true },
    externalId: { type: String, default: '' },   // Vimeo / YouTube id, used to stop duplicates
    thumbnail: { type: String, default: '' },
    duration: { type: String, default: '' },     // "12:34"
    durationSeconds: { type: Number, default: 0 },

    category: { type: String, default: 'General', trim: true, index: true },
    show: { type: String, default: '', trim: true, index: true },   // e.g. "Kids Bible Flix", "The Creation Case"
    season: { type: String, default: '', trim: true },
    episodeNumber: { type: Number, default: 0 },
    tags: { type: [String], default: [], index: true },

    status: { type: String, enum: ['Draft', 'Published', 'Archived'], default: 'Draft', index: true },
    access: { type: String, enum: ['free', 'members'], default: 'free' },
    isFeatured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    publishedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

videoSchema.index({ provider: 1, externalId: 1 });
videoSchema.index({ status: 1, publishedAt: -1 });

// (Mongoose 9: hooks are promise based, so no `next` callback)
videoSchema.pre('save', function () {
    if (this.isModified('status') && this.status === 'Published' && !this.publishedAt) this.publishedAt = new Date();
});

module.exports = mongoose.model('Video', videoSchema);
