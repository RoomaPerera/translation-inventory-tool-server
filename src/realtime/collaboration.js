// src/realtime/collaboration.js
const Translation = require('../models/Translation');
const EditLog = require('../models/editLog');
const { verifyToken } = require('../utils/jwt');

module.exports = function (io) {
    // Store active users and their typing status per translation
    const activeUsers = new Map(); // translationId -> Set of user objects
    const typingUsers = new Map(); // translationId -> Set of userIds

    io.engine.on('connection_error', (err) => {
        console.log('Engine connection_error:');
        console.log('URL:', err.req?.url);
        console.log('Message:', err.message);
        console.log('Type:', err.type);
        console.log('Description:', err.description);
        console.log('Transport:', err.transport);
        console.log('Headers:', JSON.stringify(err.req?.headers || {}, null, 2));
    });

    // authentication middleware
    io.use(async (socket, next) => {
        try {
            console.log('Socket authentication attempt:');
            console.log('From:', socket.handshake.address);
            console.log('Transport:', socket.conn.transport.name);
            console.log('Query:', socket.handshake.query);

            // Get cookies from multiple possible sources
            let cookies = socket.handshake.headers.cookie;

            // Fallback: check auth header for token
            if (!cookies && socket.handshake.auth?.token) {
                console.log('Using auth.token instead of cookies');
                const token = socket.handshake.auth.token;

                const payload = verifyToken(token);
                const { id, role, exp } = payload;

                if (exp && Date.now() >= exp * 1000) {
                    return next(new Error('Authentication Error: Token expired'));
                }

                const User = require('../models/User');
                const user = await User.findById(id).select('_id role isActive userName');
                if (!user || !user.isActive) {
                    return next(new Error('Authentication Error: User not found or inactive'));
                }

                user.lastActivity = Date.now();
                await user.save();

                socket.user = {
                    id: id.toString(),
                    role,
                    exp,
                    userName: user.userName
                };

                console.log('Socket authenticated via auth.token:', socket.user.userName);
                return next();
            }

            if (!cookies) {
                console.log('No cookies or auth token provided');
                console.log('Available headers:', Object.keys(socket.handshake.headers));
                return next(new Error('Authentication Error: No authentication provided'));
            }

            console.log('Raw cookies:', cookies);

            // Enhanced cookie parsing
            const parseCookies = (cookieString) => {
                const cookies = {};
                if (!cookieString) return cookies;

                cookieString.split(';').forEach(cookie => {
                    const parts = cookie.trim().split('=');
                    if (parts.length >= 2) {
                        const name = parts[0].trim();
                        const value = parts.slice(1).join('=');
                        try {
                            cookies[name] = decodeURIComponent(value);
                        } catch (e) {
                            cookies[name] = value;
                        }
                    }
                });
                return cookies;
            };

            const parsedCookies = parseCookies(cookies);
            console.log('Parsed cookie names:', Object.keys(parsedCookies));

            // Try multiple cookie names
            const token = parsedCookies.token ||
                parsedCookies.authToken ||
                parsedCookies.auth_token ||
                parsedCookies.jwt ||
                parsedCookies.access_token;

            if (!token) {
                console.log('No token cookie found');
                console.log('Available cookies:', Object.keys(parsedCookies));
                return next(new Error('Authentication Error: Token cookie required'));
            }
            if (!token && socket.handshake.headers.authorization) {
                const authHeader = socket.handshake.headers.authorization;
                if (authHeader.startsWith('Bearer ')) {
                    token = authHeader.substring(7);
                }
            }

            console.log('  Token found, verifying...');

            // Verify the JWT token
            const payload = verifyToken(token);
            const { id, role, exp } = payload;

            console.log('  Token payload:', { id, role, exp });

            // Check if token is expired
            if (exp && Date.now() >= exp * 1000) {
                console.log('Token expired');
                return next(new Error('Authentication Error: Token expired'));
            }

            // User verification
            const User = require('../models/User');
            const user = await User.findById(id).select('_id role isActive userName');
            if (!user) {
                console.log('User not found in database:', id);
                return next(new Error('Authentication Error: User not found'));
            }

            if (!user.isActive) {
                console.log('User is inactive:', id);
                return next(new Error('Authentication Error: User account is inactive'));
            }

            // Update user's last activity
            user.lastActivity = Date.now();
            await user.save();

            socket.user = {
                id: id.toString(),
                role,
                exp,
                userName: user.userName
            };

            console.log('Socket authenticated successfully:', {
                userId: socket.user.id,
                userName: socket.user.userName,
                role: socket.user.role,
                transport: socket.conn.transport.name
            });

            next();

        } catch (err) {
            console.log('Socket auth failed:', err.message);
            console.log('Stack:', err.stack);

            if (err.name === 'TokenExpiredError') {
                return next(new Error('Authentication Error: Token expired'));
            }
            if (err.name === 'JsonWebTokenError') {
                return next(new Error('Authentication Error: Invalid token'));
            }
            return next(new Error('Authentication Error: ' + err.message));
        }
    });

    // Helper functions
    const getUsersInTranslation = (translationId) => {
        const users = activeUsers.get(translationId);
        return users ? Array.from(users) : [];
    };

    const getTypingUsersInTranslation = (translationId) => {
        const typing = typingUsers.get(translationId);
        return typing ? Array.from(typing) : [];
    };

    const addUserToTranslation = (translationId, user) => {
        if (!activeUsers.has(translationId)) {
            activeUsers.set(translationId, new Set());
        }
        activeUsers.get(translationId).add(user);
    };

    const removeUserFromTranslation = (translationId, userId) => {
        if (activeUsers.has(translationId)) {
            const users = activeUsers.get(translationId);
            const userToRemove = Array.from(users).find(u => u.id === userId);
            if (userToRemove) {
                users.delete(userToRemove);
                if (users.size === 0) {
                    activeUsers.delete(translationId);
                }
            }
        }

        if (typingUsers.has(translationId)) {
            typingUsers.get(translationId).delete(userId);
            if (typingUsers.get(translationId).size === 0) {
                typingUsers.delete(translationId);
            }
        }
    };

    const addTypingUser = (translationId, userId) => {
        if (!typingUsers.has(translationId)) {
            typingUsers.set(translationId, new Set());
        }
        typingUsers.get(translationId).add(userId);
    };

    const removeTypingUser = (translationId, userId) => {
        if (typingUsers.has(translationId)) {
            typingUsers.get(translationId).delete(userId);
            if (typingUsers.get(translationId).size === 0) {
                typingUsers.delete(translationId);
            }
        }
    };

    const broadcastToTranslation = (translationId, event, data, excludeUserId = null) => {
        const users = getUsersInTranslation(translationId);
        users.forEach(user => {
            if (user.id !== excludeUserId && user.socketId) {
                io.to(user.socketId).emit(event, data);
            }
        });
    };

    io.on('connection', socket => {
        console.log(`Socket connected: ${socket.user.userName} (${socket.user.id}) via ${socket.conn.transport.name}`);

        // Store socket ID for the user
        socket.user.socketId = socket.id;

        // Send connection confirmation with enhanced info
        socket.emit('authenticated', {
            userId: socket.user.id,
            userName: socket.user.userName,
            role: socket.user.role,
            transport: socket.conn.transport.name,
            timestamp: new Date().toISOString()
        });

        // Monitor transport changes
        socket.conn.on('upgrade', () => {
            console.log(`Socket ${socket.user.userName} upgraded to ${socket.conn.transport.name}`);
            socket.emit('transportChanged', {
                transport: socket.conn.transport.name,
                timestamp: new Date().toISOString()
            });
        });

        socket.conn.on('upgradeError', (error) => {
            console.log(`Socket ${socket.user.userName} upgrade failed:`, error.message);
        });

        socket.on('joinTranslation', async (translationId) => {
            try {
                console.log(`User ${socket.user.userName} joining translation ${translationId}`);

                const translation = await Translation.findById(translationId);
                if (!translation) {
                    socket.emit('error', { message: 'Translation not found' });
                    return;
                }

                socket.join(`translation:${translationId}`);

                addUserToTranslation(translationId, {
                    id: socket.user.id,
                    role: socket.user.role,
                    userName: socket.user.userName,
                    socketId: socket.id,
                    joinedAt: new Date(),
                    transport: socket.conn.transport.name
                });

                try {
                    await EditLog.create({
                        translationId,
                        userId: socket.user.id,
                        action: 'join',
                        payload: {
                            userName: socket.user.userName,
                            transport: socket.conn.transport.name
                        }
                    });
                } catch (logErr) {
                    console.error('Failed to log join event:', logErr);
                }

                const currentUsers = getUsersInTranslation(translationId);
                const currentTyping = getTypingUsersInTranslation(translationId);

                socket.emit('activeUsers', {
                    users: currentUsers,
                    typingUsers: currentTyping
                });

                broadcastToTranslation(translationId, 'userJoined', {
                    userId: socket.user.id,
                    userName: socket.user.userName,
                    joinedAt: new Date(),
                    transport: socket.conn.transport.name
                }, socket.user.id);

                io.to(`translation:${translationId}`).emit('activeUsersUpdate', {
                    activeUsers: currentUsers
                });

                console.log(`User ${socket.user.userName} joined translation ${translationId} (${currentUsers.length} total users)`);

            } catch (error) {
                console.error('Error joining translation:', error);
                socket.emit('error', { message: 'Failed to join translation' });
            }
        });

        socket.on('startTyping', (translationId) => {
            try {
                console.log(`User ${socket.user.userName} started typing in translation ${translationId}`);

                addTypingUser(translationId, socket.user.id);

                // Log the typing event
                EditLog.create({
                    translationId,
                    userId: socket.user.id,
                    action: 'startTyping',
                    payload: {
                        userName: socket.user.userName
                    }
                }).catch(logErr => console.error('Failed to log typing start:', logErr));

                // Broadcast to all other users in this translation
                broadcastToTranslation(translationId, 'userStartedTyping', {
                    userId: socket.user.id,
                    userName: socket.user.userName,
                    timestamp: new Date()
                }, socket.user.id);

            } catch (error) {
                console.error('Error handling startTyping:', error);
            }
        });

        socket.on('stopTyping', (translationId) => {
            try {
                console.log(`User ${socket.user.userName} stopped typing in translation ${translationId}`);

                removeTypingUser(translationId, socket.user.id);

                // Log the typing stop event
                EditLog.create({
                    translationId,
                    userId: socket.user.id,
                    action: 'stopTyping',
                    payload: {
                        userName: socket.user.userName
                    }
                }).catch(logErr => console.error('Failed to log typing stop:', logErr));

                // Broadcast to all other users in this translation
                broadcastToTranslation(translationId, 'userStoppedTyping', {
                    userId: socket.user.id,
                    userName: socket.user.userName,
                    timestamp: new Date()
                }, socket.user.id);

            } catch (error) {
                console.error('Error handling stopTyping:', error);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log(`User ${socket.user.userName} disconnected: ${reason} (transport: ${socket.conn.transport.name})`);

            for (const [translationId, users] of activeUsers.entries()) {
                const userInTranslation = Array.from(users).find(u => u.socketId === socket.id);
                if (userInTranslation) {
                    removeUserFromTranslation(translationId, socket.user.id);

                    const remainingUsers = getUsersInTranslation(translationId);

                    if (remainingUsers.length > 0) {
                        broadcastToTranslation(translationId, 'userLeft', {
                            userId: socket.user.id,
                            userName: socket.user.userName,
                            leftAt: new Date()
                        }, socket.user.id);

                        io.to(`translation:${translationId}`).emit('activeUsersUpdate', {
                            activeUsers: remainingUsers
                        });
                    }
                }
            }
        });
    });

    // Cleanup inactive users periodically
    setInterval(() => {
        const now = Date.now();
        const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

        for (const [translationId, users] of activeUsers.entries()) {
            const activeUsersArray = Array.from(users);
            const inactiveUsers = activeUsersArray.filter(user => {
                return now - user.joinedAt.getTime() > INACTIVITY_TIMEOUT;
            });

            inactiveUsers.forEach(user => {
                removeUserFromTranslation(translationId, user.id);
                console.log(`Removed inactive user ${user.userName} from translation ${translationId}`);
            });

            if (inactiveUsers.length > 0) {
                const remainingUsers = getUsersInTranslation(translationId);
                if (remainingUsers.length > 0) {
                    io.to(`translation:${translationId}`).emit('activeUsersUpdate', {
                        activeUsers: remainingUsers
                    });
                }
            }
        }
    }, 5 * 60 * 1000);
};