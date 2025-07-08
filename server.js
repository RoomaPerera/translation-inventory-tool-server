require('dotenv').config();
require('./cron');

const connectDB = require('./src/config/db');
const { port } = require('./src/config/config');
const app = require('./src/app');
const http = require('http');

const server = http.createServer(app);

// Socket.io setup
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: { origin: '*' }
});
require('./src/realtime/collaboration')(io);

const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');
const wss = new WebSocket.Server({ server, path: '/yjs' });
wss.on('connection', setupWSConnection);

//connect to db
connectDB().then(() => {
    server.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
    process.once('SIGUSR2', () => {
        server.close(() => process.kill(process.pid, 'SIGUSR2'));
    });
    process.on('SIGINT', () => {
        server.close(() => process.exit(0));
    });
});