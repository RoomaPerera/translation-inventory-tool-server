//const { text } = require("express");
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
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' }, // needs to be approved as well
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // , required: true added newly
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    revisions: {
        type: [revisionSchema],
        default: []
    } // added newly
});

translationSchema.methods.addRevision = async function (newText, userId, maxRevisions = 6) {
    this.revisions.unshift({ text: this.translatedText, author: userId });
    if (this.revisions.length > maxRevisions) {
        this.revisions = this.revisions.slice(0, maxRevisions);
    }
    this.translatedText = newText;
    return this.save();
}

module.exports = mongoose.model('Translation', translationSchema);