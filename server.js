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

//Socket.IO setup with transport handling
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
    },
    //Start with polling, then upgrade to websocket
    transports: ['polling', 'websocket'],

    // Connection timeouts and settings
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6,

    // connection handling
    allowEIO3: true,
    connectTimeout: 45000,

    // Polling configuration
    allowUpgrades: true,
    perMessageDeflate: false,

    //cookie handling
    cookie: {
        name: 'io',
        httpOnly: true,
        path: '/',
        sameSite: 'lax'
    }
});

// error handling for Socket.IO server
io.engine.on('connection_error', (err) => {
    console.log('Socket.IO Engine connection error:');
    console.log('Request URL:', err.req?.url);
    console.log('Error code:', err.code);
    console.log('Error message:', err.message);
    console.log('Error context:', err.context);
    console.log('Headers:', err.req?.headers);

    // Log transport-specific errors
    if (err.message?.includes('websocket')) {
        console.log('→ WebSocket connection failed, client should fall back to polling');
    }
});

// Monitor transport upgrades and downgrades
io.engine.on('connection', (socket) => {
    console.log(`Socket.IO Engine connected: ${socket.id} via ${socket.transport.name}`);

    socket.on('upgrade', () => {
        console.log(`Socket ${socket.id} upgraded to ${socket.transport.name}`);
    });

    socket.on('upgradeError', (err) => {
        console.log(`Socket ${socket.id} upgrade error:`, err.message);
    });
});

// Additional debugging for transport issues
io.on('connection', (socket) => {
    console.log(`Socket.IO connected: ${socket.id} via ${socket.conn.transport.name}`);

    socket.conn.on('upgrade', () => {
        console.log(`Socket ${socket.id} upgraded to ${socket.conn.transport.name}`);
    });
});

require('./src/realtime/collaboration')(io);

// Yjs WebSocket setup with error handling
const { setupWSConnection } = require('y-websocket/bin/utils');
const wss = new WebSocket.Server({
    server,
    path: '/yjs',
    noServer: false,
    // Add WebSocket server options
    perMessageDeflate: false,
    maxPayload: 1024 * 1024, // 1MB max payload
});

wss.on('connection', (ws, req) => {
    console.log('Yjs WebSocket connection established from:', req.socket.remoteAddress);
    setupWSConnection(ws, req);
});

wss.on('error', (error) => {
    console.error('Yjs WebSocket server error:', error);
});

// Connect to DB, schedule cron jobs, and start server
connectDB().then(() => {
    const scheduleCronJobs = require('./cron');
    scheduleCronJobs();

    server.listen(port, '0.0.0.0', () => {
        console.log(`Server running on port ${port}`);
        console.log(`API available at http://localhost:${port}/api`);
        console.log(`Socket.IO available at http://localhost:${port}`);
        console.log(`Yjs WebSocket available at ws://localhost:${port}/yjs`);
        console.log(`CORS configured for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
        console.log(`Socket.IO configured with credentials support for HTTP-only cookies`);
        console.log(`Socket.IO transports: polling (primary), websocket (upgrade)`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // graceful shutdown handlers
    const gracefulShutdown = () => {
        console.log('Shutting down gracefully...');

        // Close Socket.IO server
        io.close(() => {
            console.log('Socket.IO server closed');
        });

        // Close Yjs WebSocket server
        wss.close(() => {
            console.log('Yjs WebSocket server closed');
        });

        // Close HTTP server
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
            console.log('Forcing shutdown after timeout');
            process.exit(1);
        }, 10000);
    };

    process.once('SIGUSR2', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
        gracefulShutdown();
    });

    process.on('unhandledRejection', (err) => {
        console.error('Unhandled Rejection:', err);
        gracefulShutdown();
    });

}).catch((error) => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
});