const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// GET /api/analytics/dashboard?timeRange=7d
router.get('/dashboard', analyticsController.getAllDashboardData);

// GET /api/analytics/export?format=json&timeRange=7d
router.get('/export', analyticsController.exportDashboardData);

module.exports = router;