const UserActivity = require('../models/UserActivity');

const logActivity = (type, success = true) => async (req, res, next) => {
  try {
    await UserActivity.create({
      user: req.user ? req.user.id : null,
      type,
      success,
      ip: req.ip,
      details: {
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        headers: req.headers
      },
      timestamp: new Date()
    });
  } catch (err) {
    
  }
  next();
};

module.exports = logActivity; 