// cron.js
const cron = require('node-cron');
const User = require('./src/models/User');

function scheduleCronJobs() {
    cron.schedule('0 2 * * *', async () => {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

        try {
            const result = await User.deleteMany({
                roleStatus: 'Rejected',
                deletedAt: { $lte: cutoff }
            });

            console.log(`[CRON] Deleted ${result.deletedCount} rejected users older than 30 days.`);
        } catch (err) {
            console.error('[CRON] Failed to delete rejected users:', err);
        }
    });

    console.log('Cron job scheduled for deleting rejected users daily at 2:00 AM');
}

module.exports = scheduleCronJobs;