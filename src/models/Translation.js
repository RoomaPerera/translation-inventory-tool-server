const mongoose = require('mongoose');

const TranslationSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g. 'header.welcome_back'
  translations: { 
    type: Map,
    of: String,
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Translation', TranslationSchema);
