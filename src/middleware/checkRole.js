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
  