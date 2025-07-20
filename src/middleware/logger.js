
// Logs every request with time, method, and path
const logger = (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next(); 
  };
  
  module.exports = logger;
  