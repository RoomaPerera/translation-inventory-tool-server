require('dotenv').config();
require('./cron'); // your cron jobs

const connectDB = require('./src/config/db');
const { port } = require('./src/config/config');

const app = require('./src/app');
const http = require('http');
const scheduleCronJobs = require('./cron');

const server = http.createServer(app);

// Socket.io setup
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: { origin: '*' }
});
require('./src/realtime/collaboration')(io);

// Yjs WebSocket setup
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');
const wss = new WebSocket.Server({ server, path: '/yjs' });
wss.on('connection', setupWSConnection);

// Connect to DB, start server, and cron
connectDB().then(() => {
    scheduleCronJobs();

    server.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log(`API available at http://localhost:${port}/api`);
        console.log(`Test endpoint at http://localhost:${port}/api/test`);
    });

    process.once('SIGUSR2', () => {
        server.close(() => process.kill(process.pid, 'SIGUSR2'));
    });

    process.on('SIGINT', () => {
        server.close(() => process.exit(0));
    });
});
