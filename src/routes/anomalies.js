const express = require('express');
const anomalyController = require('../controllers/anomalyController');

const router = express.Router();

// Test endpoint - no auth required (for debugging connectivity)
router.get('/test-connection', (req, res) => {
  res.json({
    success: true,
    message: 'Anomaly routes are working',
    timestamp: new Date().toISOString(),
    route: 'anomalies/test-connection'
  });
});

// Manual trigger for anomaly detection
router.post('/trigger-detection', anomalyController.triggerDetection);

// Test endpoint to create sample anomalies for testing
router.post('/create-test-data', async (req, res) => {
  try {
    const Anomaly = require('../models/Anomaly');
    
    // Create a few test anomalies
    const testAnomalies = [
      {
        type: 'login',
        message: 'Test unreviewed anomaly - Multiple failed login attempts',
        severity: 'medium',
        reviewed: false,
        details: { ip: '192.168.1.100', attempts: 5 }
      },
      {
        type: 'edit',
        message: 'Test reviewed anomaly - Unusual editing pattern detected',
        severity: 'low', 
        reviewed: true,
        details: { activityCount: 50 }
      }
    ];
    
    const createdAnomalies = await Anomaly.insertMany(testAnomalies);
    
    res.json({
      success: true,
      message: `Created ${createdAnomalies.length} test anomalies`,
      anomalies: createdAnomalies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating test data',
      error: error.message
    });
  }
});

// Cleanup old test data
router.post('/cleanup', anomalyController.cleanupOldData);

// Get anomaly statistics
router.get('/stats/summary', anomalyController.getAnomalyStats);

// Get all anomalies with filtering
router.get('/', anomalyController.getAllAnomalies);

// Add a new anomaly
router.post('/', anomalyController.createAnomaly);

// Get anomaly by ID
router.get('/:id', anomalyController.getAnomalyById);

// Update an anomaly
router.put('/:id', anomalyController.updateAnomaly);

// Mark an anomaly as reviewed
router.patch('/:id/review', anomalyController.markAsReviewed);

// Delete an anomaly
router.delete('/:id', anomalyController.deleteAnomaly);

// Block an IP address
router.post('/block-ip', async (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ success: false, message: 'IP address is required' });
    const BlockedIP = require('../models/BlockedIP');
    // Upsert to avoid duplicates
    await BlockedIP.updateOne({ ip }, { $set: { ip } }, { upsert: true });
    res.json({ success: true, message: `IP ${ip} blocked successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error blocking IP', error: error.message });
  }
});

module.exports = router; 