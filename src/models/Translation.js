//TranslationModel
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
    status: { type: String, enum: ['pending', 'completed', 'approved'], default: 'pending' }, // needs to be approved as well
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
    this.revisions.unshift({ text: this.translatedText, author: userId });
    if (this.revisions.length > maxRevisions) {
        this.revisions = this.revisions.slice(0, maxRevisions);
    }
    this.translatedText = newText;
    this.updatedAt = Date.now();
    this.version = (this.version || 1) + 1;
    this.createdBy = userId;
    return this.save();
}
// method to check for version conflicts
translationSchema.methods.checkVersionConflict = function (clientVersion) {
    return this.version !== clientVersion;
}
// method to get the current version
translationSchema.methods.getCurrentVersion = function () {
    return this.version;
}


module.exports = mongoose.model('Translation', translationSchema);