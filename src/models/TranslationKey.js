const mongoose = require('mongoose');

const translationKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TranslationKey', translationKeySchema);
