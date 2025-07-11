const ActivityLog = require('../models/ActivityLog');

// 1. Add a new activity 
const addActivityLog = async (req, res) => {
  try {
    const { userName, role, description } = req.body;

    const newLog = new ActivityLog({ userName, role, description });
    await newLog.save();

    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Get activity logs 
const getActivityLogs = async (req, res) => {
  try {
    const { userRole } = req.query; 

    let logs;

    if (userRole === 'admin') {
      
      logs = await ActivityLog.find();
    } 
    else if (userRole === 'developer') {
     
      logs = await ActivityLog.find({
        role: { $in: ['developer', 'translator'] }
      });
    } 
    else if (userRole === 'translator') {
      
      logs = await ActivityLog.find({
        role: { $in: ['translator'] }
      });
    } 
    else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addActivityLog, getActivityLogs };
