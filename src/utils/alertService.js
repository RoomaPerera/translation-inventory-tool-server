// Simple alert service that logs to console
async function sendAlert(message) {
    try {
      // Log the alert to console
      console.log('SECURITY ALERT:', message);
      console.log(`Time: ${new Date().toLocaleString()}`);
      
    } catch (error) {
      console.error('Error logging alert:', error);
    }
  }
  
  // Function to send immediate alerts for critical issues
  async function sendCriticalAlert(message, details = {}) {
    try {
      console.log('CRITICAL ALERT:', message);
      console.log('Details:', details);
      console.log(`Time: ${new Date().toLocaleString()}`);
      
    } catch (error) {
      console.error('Error logging critical alert:', error);
    }
  }
  
  module.exports = { sendAlert, sendCriticalAlert }; 