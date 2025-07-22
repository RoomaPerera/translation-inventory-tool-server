// models/FileValidationLog.js

const mongoose = require('mongoose');

const FileValidationLogSchema = new mongoose.Schema({
  fileName: { type: String },
  complexity: { type: String, enum: ['High', 'Medium', 'Normal', null], default: null },
  readabilityScores: { type: Object, default: null },
  readabilitySummary: { type: String, default: null },
  validationResult: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FileValidationLog', FileValidationLogSchema);
