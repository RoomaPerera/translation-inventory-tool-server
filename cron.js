require('dotenv').config();
const connectDB = require('./src/config/db');
const cron = require('node-cron');
const User = require('./src/models/User');

async function startCronJobs() {
    await connectDB();
    cron.schedule('0 2 * * *', async () => {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await User.deleteMany({
            deletedAt: { $lte: cutoff }
        });
        console.log(`Purged ${result.deletedCount} rejected users older than 30 days.`);
    })
    console.log('cron job scheduled');
};

startCronJobs().catch(err => {
    console.error('cron failed to start', err);
    process.exit(1);
});