const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema({
  translationKey: { type: String, required: true }, 
  language: { type: String, required: true },
  translatedText: { type: String, required: true },
  product: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  context: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'approved'], default: 'pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Translation', translationSchema);