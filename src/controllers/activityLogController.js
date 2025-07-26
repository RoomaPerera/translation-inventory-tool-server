const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

// 1. Add a new activity 
const addActivityLog = async (req, res) => {
    try {
        // Use authenticated user info
        const { description } = req.body;
        const { id, role } = req.user;
        // Fetch userName from DB
        const user = await User.findById(id).select('userName');
        if (!user) return res.status(404).json({ message: 'User not found' });
        const newLog = new ActivityLog({ userId: id, userName: user.userName, role: role.toLowerCase(), description });
        await newLog.save();
        res.status(201).json(newLog);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Get activity logs 
const getActivityLogs = async (req, res) => {
  console.log('getActivityLogs called, req.user:', req.user, 'req.query:', req.query);
  try {
    const { role, id } = req.user;
    let logs;
    if (role.toLowerCase() === 'admin') {
      // Admin: filter by role or user if provided
      const query = {};
      if (req.query.filterRole) query.role = req.query.filterRole.toLowerCase();
      if (req.query.userId) query.userId = req.query.userId;
      console.log('Admin query:', query);
      logs = await ActivityLog.find(query).sort({ timeStamp: -1 });
      console.log('Admin logs found:', logs);
    } else if (role.toLowerCase() === 'translator') {
      // Translator: always see only their own logs
      const query = { userId: id, role: { $in: ['translator', 'Translator'] } };
      console.log('Translator query:', query);
      logs = await ActivityLog.find(query).sort({ timeStamp: -1 });
      console.log('Translator logs found:', logs);
    } else {
      return res.status(403).json({ message: 'Unauthorized role' });
    }
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error in getActivityLogs:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addActivityLog, getActivityLogs };
