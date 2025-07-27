const express = require('express');
const router = express.Router();
const { getActivityLogs } = require('../controllers/activityLogController');
const requireAuth = require('../middleware/requireAuth');

// Get activity logs - Admin and Translator can view logs
router.get('/', requireAuth, (req, res, next) => {
  const allowed = ['admin', 'translator'];
  if (!req.user || !allowed.includes(req.user.role.toLowerCase())) {
    return res.status(403).json({ error: 'Insufficient rights' });
  }
  next();
}, getActivityLogs);

module.exports = router;