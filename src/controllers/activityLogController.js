const ActivityLog = require('../models/ActivityLog');

// Get activity logs 
const getActivityLogs = async (req, res) => {
  console.log('ActivityLog request received');
  console.log('User from request:', req.user);
  console.log('Query parameters:', req.query);

  try {
    const { role, id } = req.user;
    let logs;
    let query = {};
    
    console.log(`User role: ${role}, User ID: ${id}`);
    
    // Build query based on user role
    if (role.toLowerCase() === 'admin') {
      console.log('Processing request as Admin');
      // Admin: can filter by role, user, and date range
      if (req.query.filterRole) query.role = req.query.filterRole.toLowerCase();
      if (req.query.userId) query.userId = req.query.userId;
      
      // Date filtering
      if (req.query.startDate || req.query.endDate) {
        query.timeStamp = {};
        if (req.query.startDate) {
          const startDate = new Date(req.query.startDate);
          startDate.setHours(0, 0, 0, 0); // Start of day
          query.timeStamp.$gte = startDate;
        }
        if (req.query.endDate) {
          const endDate = new Date(req.query.endDate);
          endDate.setHours(23, 59, 59, 999); // End of day
          query.timeStamp.$lte = endDate;
        }
      }
      
      logs = await ActivityLog.find(query).sort({ timeStamp: -1 }).limit(parseInt(req.query.limit) || 100);
      
    } else if (role.toLowerCase() === 'translator') {
      // Translator: always see only their own logs
      query = { userId: id, role: { $in: ['translator', 'Translator'] } };
      
      // Date filtering for translators
      if (req.query.startDate || req.query.endDate) {
        query.timeStamp = {};
        if (req.query.startDate) {
          const startDate = new Date(req.query.startDate);
          startDate.setHours(0, 0, 0, 0); // Start of day
          query.timeStamp.$gte = startDate;
        }
        if (req.query.endDate) {
          const endDate = new Date(req.query.endDate);
          endDate.setHours(23, 59, 59, 999); // End of day
          query.timeStamp.$lte = endDate;
        }
      }
      
      logs = await ActivityLog.find(query).sort({ timeStamp: -1 }).limit(parseInt(req.query.limit) || 100);
      
    } else {
      return res.status(403).json({ message: 'Unauthorized role' });
    }
    
    console.log('Final query:', JSON.stringify(query));
    console.log('Finding logs with query...');
    
    // Count total logs matching the query
    const totalCount = await ActivityLog.countDocuments(query);
    console.log(`Total matching logs: ${totalCount}`);
    
    // If no logs found, check if there are any logs in the collection
    if (totalCount === 0) {
      const allLogsCount = await ActivityLog.countDocuments({});
      console.log(`Total logs in collection: ${allLogsCount}`);
      
      if (allLogsCount > 0) {
        // There are logs but none match the query
        console.log('There are logs in the collection, but none match the query');
      } else {
        // No logs at all in the collection
        console.log('No logs found in the collection at all');
      }
    }
    
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error in getActivityLogs:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getActivityLogs };
