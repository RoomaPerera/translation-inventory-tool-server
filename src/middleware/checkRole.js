// Middleware to check if user has 'admin' role
const checkAdmin = (req, res, next) => {
    const userRole = req.headers['role']; // example: 'admin', 'translator'
  
    if (!userRole || userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }
  
    next();
  };
  
  module.exports = checkAdmin;
  // Checks if the user's role is allowed to access the route
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
      const role = req.query.userRole; 
  
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: 'Forbidden: Role not allowed' });
      }
  
      next(); // allow to proceed
    };
  };
  
  module.exports = checkRole;
  