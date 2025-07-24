// Middleware to check if user has 'admin' role
const checkAdmin = (req, res, next) => {
    const userRole = req.headers['role']; // example: 'admin', 'translator'
  
    if (!userRole || userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }
  
    next();
  };
  
  module.exports = checkAdmin;
  