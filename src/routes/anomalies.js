const express = require('express');
const anomalyController = require('../controllers/anomalyController');

const router = express.Router();

// Manual trigger for anomaly detection
router.post('/trigger-detection', anomalyController.triggerDetection);

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