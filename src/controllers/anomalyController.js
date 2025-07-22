const Anomaly = require('../models/Anomaly');
const UserActivity = require('../models/UserActivity');
const User = require('../models/User');
const anomalyDetector = require('../utils/anomalyDetector');

// Manual trigger for anomaly detection
const triggerDetection = async (req, res) => {
  try {
    console.log('🔍 Manual anomaly detection triggered');
    await anomalyDetector.detectAnomalies();
    res.json({ 
      success: true, 
      message: 'Anomaly detection completed successfully' 
    });
  } catch (error) {
    console.error('Error in manual anomaly detection:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error triggering anomaly detection',
      error: error.message 
    });
  }
};

// Cleanup old test data
const cleanupOldData = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Clean up old anomalies
    const deletedAnomalies = await Anomaly.deleteMany({
      detectedAt: { $lt: thirtyDaysAgo },
      reviewed: true
    });
    
    // Clean up old user activities
    const deletedActivities = await UserActivity.deleteMany({
      timestamp: { $lt: thirtyDaysAgo }
    });
    
    res.json({
      success: true,
      message: 'Cleanup completed',
      deletedAnomalies: deletedAnomalies.deletedCount,
      deletedActivities: deletedActivities.deletedCount
    });
  } catch (error) {
    console.error('Error in cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Error during cleanup',
      error: error.message
    });
  }
};

// Get anomaly statistics
const getAnomalyStats = async (req, res) => {
  try {
    const totalAnomalies = await Anomaly.countDocuments();
    const unresolvedAnomalies = await Anomaly.countDocuments({ reviewed: false });
    const highSeverityAnomalies = await Anomaly.countDocuments({ severity: 'high' });
    const mediumSeverityAnomalies = await Anomaly.countDocuments({ severity: 'medium' });
    const lowSeverityAnomalies = await Anomaly.countDocuments({ severity: 'low' });
    
    // Get anomalies by type
    const loginAnomalies = await Anomaly.countDocuments({ type: 'login' });
    const editAnomalies = await Anomaly.countDocuments({ type: 'edit' });
    const systemAnomalies = await Anomaly.countDocuments({ type: 'system' });
    
    // Get recent anomalies (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAnomalies = await Anomaly.countDocuments({
      detectedAt: { $gte: twentyFourHoursAgo }
    });
    
    res.json({
      success: true,
      stats: {
        total: totalAnomalies,
        unresolved: unresolvedAnomalies,
        bySeverity: {
          high: highSeverityAnomalies,
          medium: mediumSeverityAnomalies,
          low: lowSeverityAnomalies
        },
        byType: {
          login: loginAnomalies,
          edit: editAnomalies,
          system: systemAnomalies
        },
        recent24h: recentAnomalies
      }
    });
  } catch (error) {
    console.error('Error getting anomaly stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching anomaly statistics',
      error: error.message
    });
  }
};

// Get all anomalies with filtering
const getAllAnomalies = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      severity, 
      reviewed, 
      startDate, 
      endDate 
    } = req.query;
    
    const filter = {};
    
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (reviewed !== undefined) filter.reviewed = reviewed === 'true';
    if (startDate || endDate) {
      filter.detectedAt = {};
      if (startDate) filter.detectedAt.$gte = new Date(startDate);
      if (endDate) filter.detectedAt.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const anomalies = await Anomaly.find(filter)
      .sort({ detectedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email');
    
    const total = await Anomaly.countDocuments(filter);
    
    res.json({
      success: true,
      anomalies,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        totalItems: total
      }
    });
  } catch (error) {
    console.error('Error getting anomalies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching anomalies',
      error: error.message
    });
  }
};

// Create a new anomaly
const createAnomaly = async (req, res) => {
  try {
    const { type, message, severity, details } = req.body;
    
    const anomaly = new Anomaly({
      type,
      message,
      severity: severity || 'medium',
      reviewed: false,
      details: details || {}
    });
    
    await anomaly.save();
    
    res.status(201).json({
      success: true,
      message: 'Anomaly created successfully',
      anomaly
    });
  } catch (error) {
    console.error('Error creating anomaly:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating anomaly',
      error: error.message
    });
  }
};

// Get anomaly by ID
const getAnomalyById = async (req, res) => {
  try {
    const anomaly = await Anomaly.findById(req.params.id)
      .populate('user', 'name email');
    
    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: 'Anomaly not found'
      });
    }
    
    res.json({
      success: true,
      anomaly
    });
  } catch (error) {
    console.error('Error getting anomaly by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching anomaly',
      error: error.message
    });
  }
};

// Update an anomaly
const updateAnomaly = async (req, res) => {
  try {
    const { type, message, severity, details, reviewed } = req.body;
    
    const updateData = {};
    if (type) updateData.type = type;
    if (message) updateData.message = message;
    if (severity) updateData.severity = severity;
    if (details) updateData.details = details;
    if (reviewed !== undefined) updateData.reviewed = reviewed;
    
    const anomaly = await Anomaly.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: 'Anomaly not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Anomaly updated successfully',
      anomaly
    });
  } catch (error) {
    console.error('Error updating anomaly:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating anomaly',
      error: error.message
    });
  }
};

// Mark an anomaly as reviewed
const markAsReviewed = async (req, res) => {
  try {
    const anomaly = await Anomaly.findByIdAndUpdate(
      req.params.id,
      { reviewed: true },
      { new: true }
    );
    
    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: 'Anomaly not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Anomaly marked as reviewed',
      anomaly
    });
  } catch (error) {
    console.error('Error marking anomaly as reviewed:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating anomaly',
      error: error.message
    });
  }
};

// Delete an anomaly
const deleteAnomaly = async (req, res) => {
  try {
    const anomaly = await Anomaly.findByIdAndDelete(req.params.id);
    
    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: 'Anomaly not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Anomaly deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting anomaly:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting anomaly',
      error: error.message
    });
  }
};

module.exports = {
  triggerDetection,
  cleanupOldData,
  getAnomalyStats,
  getAllAnomalies,
  createAnomaly,
  getAnomalyById,
  updateAnomaly,
  markAsReviewed,
  deleteAnomaly
}; 