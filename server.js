require('dotenv').config();
require('./cron'); // your cron jobs

const connectDB = require('./src/config/db');
const { port } = require('./src/config/config');
const app = require('./src/app');


app.get('/', (req, res) => {
  res.status(200).send('API is running.');
});


const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = app.listen(port, () => {
    console.log(`⚡ Server running on port ${port}`);
    console.log(`🔗 API available at http://localhost:${port}/api`);
    console.log(`🧪 Test endpoint at http://localhost:${port}/api/test`);
  });

  process.once('SIGUSR2', () => {
    server.close(() => process.kill(process.pid, 'SIGUSR2'));
  });

  process.on('SIGINT', () => {
    server.close(() => process.exit(0));
  });
});
