const express = require('express');
const router = express.Router();
const { addActivityLog, getActivityLogs } = require('../controllers/activityLogController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

// All routes require authentication and role check
router.post('/', requireAuth, requireRole('Admin'), addActivityLog);
router.post('/', requireAuth, requireRole('Translator'), addActivityLog);
router.get('/', requireAuth, (req, res, next) => {
  const allowed = ['admin', 'translator'];
  if (!req.user || !allowed.includes(req.user.role.toLowerCase())) {
    return res.status(403).json({ error: 'Insufficient rights' });
  }
  next();
}, getActivityLogs);

module.exports = router;

