const mongoose = require('mongoose');

const anomalySchema = new mongoose.Schema({
  type: String,
  message: String,
  severity: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  detectedAt: { type: Date, default: Date.now },
  reviewed: { type: Boolean, default: false },
  details: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('Anomaly', anomalySchema); 