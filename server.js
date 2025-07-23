require('dotenv').config();

const connectDB = require('./src/config/db');
const {port } = require('./src/config/config');
const app = require('./src/app');
const scheduleCronJobs = require('./cron');
//connect to db
connectDB().then(() => {
    scheduleCronJobs();
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`API available at http://localhost:${port}/api`);
      console.log(`Test endpoint at http://localhost:${port}/api/test`);
    });
    
    // Graceful shutdown handlers
    process.once('SIGUSR2', () => {
      server.close(() => process.kill(process.pid, 'SIGUSR2'));
    });
    
    process.on('SIGINT', () => {
        server.close(() => process.exit(0));
    });
});
