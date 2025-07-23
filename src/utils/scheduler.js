const cron = require('node-cron');
const anomalyDetector = require('./anomalyDetector');

let isRunning = false;

function start() {
  console.log('Starting anomaly detection scheduler...');
  
  // Run anomaly detection every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    if (isRunning) {
      console.log('Anomaly detection already running, skipping...');
      return;
    }
    
    isRunning = true;
    console.log('Running scheduled anomaly detection...');
    
    try {
      await anomalyDetector.detectAnomalies();
      console.log('Anomaly detection completed successfully');
    } catch (error) {
      console.error('Error in anomaly detection:', error);
    } finally {
      isRunning = false;
    }
  });
  
  // Run initial detection after 30 seconds
  setTimeout(async () => {
    console.log('Running initial anomaly detection...');
    try {
      await anomalyDetector.detectAnomalies();
      console.log('Initial anomaly detection completed');
    } catch (error) {
      console.error('Error in initial anomaly detection:', error);
    }
  }, 30000);
  
  console.log('Scheduler started successfully');
  console.log('Anomaly detection will run every 5 minutes');
  console.log('Scanning real database data for security threats');
}

// Manual trigger for testing
async function manualTrigger() {
  console.log('🔧 Manual anomaly detection triggered...');
  try {
    await anomalyDetector.detectAnomalies();
    console.log('Manual anomaly detection completed');
  } catch (error) {
    console.error('Error in manual anomaly detection:', error);
  }
}

module.exports = { start, manualTrigger }; 