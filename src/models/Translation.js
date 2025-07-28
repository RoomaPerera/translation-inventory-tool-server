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
    translatedText: { type: String, required: true },
    product: { type: String, required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    context: { type: String },
    // FIXED: Added 'approved' to enum
    status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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

module.exports = mongoose.model('Translation', translationSchema);