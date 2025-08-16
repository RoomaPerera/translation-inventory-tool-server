// Translation.js - FIXED VERSION
const { default: mongoose } = require("mongoose");

const revisionSchema = new mongoose.Schema({
    text: String,
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const translationSchema = new mongoose.Schema({
    translationKey: { type: String, required: true },
    language: { type: String, required: true },
    translatedText: { type: String, default: '' }, // Allow empty strings for placeholders
    product: { type: String, default: 'General' }, // Made optional with default value since we use projects now
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    context: { type: String },
    status: { type: String, enum: ['pending', 'approved'], default: 'pending' }, // needs to be approved as well
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // , required: true added newly
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    revisions: {
        type: [revisionSchema],
        default: []
    },
    version: {
        type: Number,
        default: 1
    }
});

translationSchema.methods.addRevision = async function (newText, userId, maxRevisions = 6) {
    // Only add revision if text actually changed
    if (this.translatedText !== newText) {
        this.revisions.unshift({
            text: this.translatedText,
            author: userId,
            createdAt: new Date()
        });

        if (this.revisions.length > maxRevisions) {
            this.revisions = this.revisions.slice(0, maxRevisions);
        }

        this.translatedText = newText;
        this.updatedAt = Date.now();
        this.version += 1;
    }

    return this.save();
}

// Method to check for version conflicts
translationSchema.methods.checkVersionConflict = function (clientVersion) {
    return this.version !== clientVersion;
}

// Method to get the current version
translationSchema.methods.getCurrentVersion = function () {
    return this.version;
}

// Add indexes for better query performance
translationSchema.index({ projectId: 1, language: 1 });
translationSchema.index({ translationKey: 1 });
translationSchema.index({ createdAt: -1 });
translationSchema.index({ status: 1 });
translationSchema.index({ projectId: 1, translationKey: 1, language: 1 }, { unique: true });

module.exports = mongoose.model('Translation', translationSchema);