require('dotenv').config();
require('./cron');

const connectDB = require('./src/config/db');
const {PORT } = require('./src/config/config');
const app = require('./src/app');

//connect to db
connectDB().then(() => {
    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
    process.once('SIGUSR2', () => {
        server.close(() => process.kill(process.pid, 'SIGUSR2'));
    });
    process.on('SIGINT', () => {
        server.close(() => process.exit(0));
    });
});