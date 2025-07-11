const express = require('express');
const router = express.Router();
const { addActivityLog, getActivityLogs } = require('../controllers/activityLogController');
const checkRole = require('../middleware/checkRole'); 


router.post('/', addActivityLog);


router.get('/', checkRole(['admin', 'developer', 'translator']), getActivityLogs);

module.exports = router;

