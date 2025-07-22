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
  try {
    const { role, id } = req.user;
    const { filterRole, userId } = req.query; // Admin can filter by role or user
    let logs;
    if (role === 'Admin') {
      // Admin: filter by role or user if provided
      const query = {};
      if (filterRole) query.role = filterRole.toLowerCase();
      if (userId) query.userId = userId;
      logs = await ActivityLog.find(query);
    } else if (role === 'Translator') {
      // Translator: only see their own logs
      logs = await ActivityLog.find({ userId: id, role: 'translator' });
    } else {
      return res.status(403).json({ message: 'Unauthorized role' });
    }
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addActivityLog, getActivityLogs };
