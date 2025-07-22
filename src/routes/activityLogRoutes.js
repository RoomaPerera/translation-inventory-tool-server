const express = require('express');
const router = express.Router();
const { addActivityLog, getActivityLogs } = require('../controllers/activityLogController');
const requireAuth = require('../middleware/requireAuth');

// All routes require authentication
router.post('/', requireAuth, addActivityLog);
router.get('/', requireAuth, getActivityLogs);

module.exports = router;