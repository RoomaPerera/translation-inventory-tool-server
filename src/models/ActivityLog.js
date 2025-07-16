const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'translator', 'developer'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  timeStamp: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
