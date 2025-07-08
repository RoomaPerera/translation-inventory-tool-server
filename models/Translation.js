const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        trim: true
    },
    language: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    value: {
        type: String,
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    status: {
        type: String,          // for approve / review flow
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // REQ‑21 — different wording in different contexts (mobile, tooltip…)
    context: { type: String, default: null },

    // optional “product” string if your team uses that instead of ObjectId
    product: { type: String }
},
    { timestamps: true }
);

translationSchema.index(
    { project: 1, key: 1, language: 1, context: 1 },
    { unique: true }
);


module.exports = mongoose.model('Translation', translationSchema);