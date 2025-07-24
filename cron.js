const cron = require('node-cron');
const User = require('./src/models/User');

function startCronJobs() {
    cron.schedule('0 2 * * *', async () => {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await User.deleteMany({
            deletedAt: { $ne: null, $lte: cutoff }
        });
        console.log(`Purged ${result.deletedCount} rejected users older than 30 days.`);
    });
    console.log('Cron job scheduled.');
}

module.exports = startCronJobs;