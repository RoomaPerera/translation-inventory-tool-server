const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const {
    getDashboardOverview,
    getUserAnalytics,
    getChartData,
    exportAnalytics,
    populateData
} = require('../controllers/analyticsController');

// Apply auth middleware to all routes
router.use(requireAuth);

// Get dashboard overview
router.get('/overview', getDashboardOverview);

// Get user-specific analytics
router.get('/user', getUserAnalytics);

// Get chart data
router.get('/charts', getChartData);

// Export analytics
router.get('/export', exportAnalytics);

// Populate analytics data (admin only)
router.post('/populate', populateData);

module.exports = router;