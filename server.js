require('dotenv').config();
require('./cron');

const connectDB = require('./src/config/db');
const { port } = require('./src/config/config');
const app = require('./src/app');

//connect to db
connectDB().then(() => {
    const server = app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
    process.once('SIGUSR2', () => {
        server.close(() => process.kill(process.pid, 'SIGUSR2'));
    });
    process.on('SIGINT', () => {
        server.close(() => process.exit(0));
    });
});