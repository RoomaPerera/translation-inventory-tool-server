const UserActivity = require('../models/UserActivity');
const Anomaly = require('../models/Anomaly');
const alertService = require('./alertService');
const mongoose = require('mongoose');

async function detectAnomalies() {
  try {
    console.log('Starting anomaly detection...');
    
    // Check database connection
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      console.error('Database not connected. State:', dbState);
      console.error('0=disconnected, 1=connected, 2=connecting, 3=disconnecting');
      return;
    }
    console.log('Database connection verified');
    
    // Get activities from the last 24 hours (more realistic timeframe)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // 1. Detect multiple failed login attempts (only recent ones)
    await detectFailedLoginAnomalies(twentyFourHoursAgo);
    
    // 2. Detect unusual IP addresses (only recent activities)
    await detectUnusualIPAnomalies(twentyFourHoursAgo);
    
    // 3. Detect rapid activity bursts (only very recent)
    await detectActivityBurstAnomalies();
    
    // 4. Detect suspicious user patterns (only recent)
    await detectSuspiciousUserPatterns(twentyFourHoursAgo);
    
    console.log('Anomaly detection completed successfully');
  } catch (error) {
    console.error('Error in anomaly detection:', error);
    // Don't throw - let scheduler continue
  }
}

async function detectFailedLoginAnomalies(since) {
  // Find failed login attempts in the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const failedLogins = await UserActivity.find({
    type: 'failed_login',
    timestamp: { $gte: fiveMinutesAgo }
  });
  
  console.log(`🔍 Found ${failedLogins.length} failed login attempts in the last 5 minutes`);
  
  if (failedLogins.length === 0) {
    console.log('No failed login attempts detected in the last 5 minutes');
    return;
  }
  
  // Group by IP address
  const loginAttemptsByIP = {};
  failedLogins.forEach(activity => {
    const ip = activity.ip;
    if (!loginAttemptsByIP[ip]) {
      loginAttemptsByIP[ip] = [];
    }
    loginAttemptsByIP[ip].push(activity);
  });
  
  console.log(`Grouped by IP:`, Object.keys(loginAttemptsByIP).map(ip => `${ip}: ${loginAttemptsByIP[ip].length} attempts`));
  
  // Check for suspicious patterns (only if there are real attempts)
  for (const [ip, attempts] of Object.entries(loginAttemptsByIP)) {
    console.log(`Checking IP ${ip} with ${attempts.length} failed attempts`);
    
    if (attempts.length >= 4) { // 4 attempts in 5 minutes
      console.log(`IP ${ip} has ${attempts.length} failed attempts - creating anomaly`);
      
      // Check if anomaly already exists for this IP in the last 5 minutes
      const existingAnomaly = await Anomaly.findOne({
        type: 'login',
        'details.ip': ip,
        detectedAt: { $gte: fiveMinutesAgo },
        message: { $regex: /Multiple failed login attempts from IP/ }
      });
      
      if (existingAnomaly) {
        console.log(`Anomaly already exists for IP ${ip}, skipping duplicate detection`);
        continue;
      }
      
      const anomaly = new Anomaly({
        type: 'login',
        message: `Multiple failed login attempts from IP: ${ip}`,
        severity: attempts.length >= 4 ? 'high' : 'medium',
        reviewed: false,
        details: {
          ip: ip,
          attempts: attempts.length,
          timeRange: '24 hours',
          activities: attempts.map(a => ({
            timestamp: a.timestamp,
            user: a.user
          }))
        }
      });
      
      await anomaly.save();
      await alertService.sendAlert(`Security Alert: ${attempts.length} failed login attempts from IP ${ip} in the last 24 hours`);
      console.log(`New anomaly created for IP ${ip} with ${attempts.length} failed attempts`);
    }
  }
}

async function detectUnusualIPAnomalies(since) {
  // Find all activities in the last 24 hours
  const activities = await UserActivity.find({
    timestamp: { $gte: since }
  }).populate('user');
  
  if (activities.length === 0) {
    console.log('No user activities detected in the last 24 hours');
    return;
  }
  
  // Group by user
  const userActivities = {};
  activities.forEach(activity => {
    if (activity.user) {
      const userId = activity.user._id.toString();
      if (!userActivities[userId]) {
        userActivities[userId] = [];
      }
      userActivities[userId].push(activity);
    }
  });
  
  // Check for users logging in from multiple IPs (only if there are real activities)
  for (const [userId, userActs] of Object.entries(userActivities)) {
    const uniqueIPs = [...new Set(userActs.map(a => a.ip))];
    
    if (uniqueIPs.length >= 2) { // Lowered threshold to 2 different IPs
      
      // Check if anomaly already exists for this user in the last 24 hours
      const existingAnomaly = await Anomaly.findOne({
        type: 'login',
        'details.userId': userId,
        detectedAt: { $gte: since },
        message: { $regex: /User logged in from multiple IP addresses/ }
      });
      
      if (existingAnomaly) {
        console.log(`Anomaly already exists for user ${userId}, skipping duplicate detection`);
        continue;
      }
      
      const anomaly = new Anomaly({
        type: 'login',
        message: `User logged in from multiple IP addresses`,
        severity: 'medium',
        reviewed: false,
        details: {
          userId: userId,
          ips: uniqueIPs,
          activityCount: userActs.length,
          timeRange: '24 hours'
        }
      });
      
      await anomaly.save();
      await alertService.sendAlert(`Security Alert: User ${userId} logged in from ${uniqueIPs.length} different IPs in the last 24 hours`);
      console.log(`New anomaly created for user ${userId} with ${uniqueIPs.length} different IPs`);
    }
  }
}

async function detectActivityBurstAnomalies() {
  // Find all activities in the last 30 minutes (very recent)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const recentActivities = await UserActivity.find({
    timestamp: { $gte: thirtyMinutesAgo }
  });
  
  if (recentActivities.length === 0) {
    console.log('No recent activities detected in the last 30 minutes');
    return;
  }
  
  // Group by user
  const userActivityCounts = {};
  recentActivities.forEach(activity => {
    if (activity.user) {
      const userId = activity.user.toString();
      userActivityCounts[userId] = (userActivityCounts[userId] || 0) + 1;
    }
  });
  
  // Check for unusual activity bursts (only if there are real activities)
  for (const [userId, count] of Object.entries(userActivityCounts)) {
    if (count >= 8) { // Lowered threshold to 8 actions in 30 minutes
      
      // Check if anomaly already exists for this user in the last 30 minutes
      const existingAnomaly = await Anomaly.findOne({
        type: 'edit',
        'details.userId': userId,
        detectedAt: { $gte: thirtyMinutesAgo },
        message: { $regex: /Unusual activity burst detected for user/ }
      });
      
      if (existingAnomaly) {
        console.log(`Anomaly already exists for user ${userId} activity burst, skipping duplicate detection`);
        continue;
      }
      
      const anomaly = new Anomaly({
        type: 'edit',
        message: `Unusual activity burst detected for user`,
        severity: 'medium',
        reviewed: false,
        details: {
          userId: userId,
          activityCount: count,
          timeRange: '30 minutes'
        }
      });
      
      await anomaly.save();
      await alertService.sendAlert(`Activity Alert: User ${userId} performed ${count} actions in 30 minutes`);
      console.log(`New anomaly created for user ${userId} with ${count} activities in 30 minutes`);
    }
  }
}

async function detectSuspiciousUserPatterns(since) {
  // Find all failed activities in the last 30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const failedActivities = await UserActivity.find({
    success: false,
    timestamp: { $gte: thirtyMinutesAgo }
  });
  
  if (failedActivities.length === 0) {
    console.log('No failed activities detected in the last 24 hours');
    return;
  }
  
  // Group by user
  const userFailures = {};
  failedActivities.forEach(activity => {
    if (activity.user) {
      const userId = activity.user.toString();
      if (!userFailures[userId]) {
        userFailures[userId] = [];
      }
      userFailures[userId].push(activity);
    }
  });
  
  // Check for users with multiple types of failures (only if there are real failures)
  for (const [userId, failures] of Object.entries(userFailures)) {
    const failureTypes = [...new Set(failures.map(f => f.type))];
    
    if (failureTypes.length >= 4) { // Lowered threshold to 4 different failure types in 30 minutes
      
      // Check if anomaly already exists for this user in the last 30 minutes
      const existingAnomaly = await Anomaly.findOne({
        type: 'error',
        'details.userId': userId,
        detectedAt: { $gte: thirtyMinutesAgo },
        message: { $regex: /User experiencing multiple types of failures/ }
      });
      
      if (existingAnomaly) {
        console.log(`Anomaly already exists for user ${userId} failure patterns, skipping duplicate detection`);
        continue;
      }
      
      const anomaly = new Anomaly({
        type: 'error',
        message: `User experiencing multiple types of failures`,
        severity: 'low',
        reviewed: false,
        details: {
          userId: userId,
          failureTypes: failureTypes,
          totalFailures: failures.length
        }
      });
      
      await anomaly.save();
      await alertService.sendAlert(`User Alert: User ${userId} experiencing ${failureTypes.length} different types of failures in the last 24 hours`);
      console.log(`New anomaly created for user ${userId} with ${failureTypes.length} failure types`);
    }
  }
}

module.exports = { detectAnomalies }; 