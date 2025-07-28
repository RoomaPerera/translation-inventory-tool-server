require('dotenv').config();
require('./cron');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');

const connectDB = require('./src/config/db');
const { port } = require('./src/config/config');
const app = require('./src/app');

const server = http.createServer(app);

// Socket.IO setup with CORS and transport configuration
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
    },
    // Enable both transports with polling as fallback
    transports: ['polling', 'websocket'],
    // Increased timeouts for better stability
    pingTimeout: 60000,
    pingInterval: 25000,
    // Add upgrade timeout
    upgradeTimeout: 10000,
    //  Add max HTTP buffer size
    maxHttpBufferSize: 1e6,
    // Allow HTTP long-polling as fallback
    allowEIO3: true
});

//Add error handling for Socket.IO server
io.engine.on('connection_error', (err) => {
    console.log('Socket.IO connection error:', err.req);
    console.log('Error code:', err.code);
    console.log('Error message:', err.message);
    console.log('Error context:', err.context);
});

require('./src/realtime/collaboration')(io);

// Yjs WebSocket setup
const { setupWSConnection } = require('y-websocket/bin/utils');
const wss = new WebSocket.Server({
    server,
    path: '/yjs',
    noServer: false
});
wss.on('connection', setupWSConnection);

// Connect to DB, schedule cron jobs, and start server
connectDB().then(() => {
    const scheduleCronJobs = require('./cron');
    scheduleCronJobs();

    server.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log(`API available at http://localhost:${port}/api`);
        console.log(`Socket.IO available at http://localhost:${port}`);
        console.log(`Yjs WebSocket available at ws://localhost:${port}/yjs`);
        console.log(`CORS configured for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
        console.log('Socket.IO configured with credentials support for HTTP-only cookies');

        //Add transport info
        console.log('Socket.IO transports: polling (fallback), websocket (upgrade)');
    });

    // Graceful shutdown handlers
    process.once('SIGUSR2', () => {
        server.close(() => process.kill(process.pid, 'SIGUSR2'));
    });

    process.on('SIGINT', () => {
        console.log('Shutting down gracefully...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });

    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
        process.exit(1);
    });

    process.on('unhandledRejection', (err) => {
        console.error('Unhandled Rejection:', err);
        server.close(() => process.exit(1));
    });
}).catch((error) => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
});