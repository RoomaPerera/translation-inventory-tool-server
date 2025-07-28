// collaboration.js
const Translation = require('../models/Translation');
const EditLog = require('../models/editLog');
const { verifyToken } = require('../utils/jwt');

module.exports = function (io) {
    // Store active users and their typing status per translation
    const activeUsers = new Map(); // translationId -> Set of user objects
    const typingUsers = new Map(); // translationId -> Set of userIds

    io.engine.on('connection_error', (err) => {
        console.log('Engine connection_error:', err.req?.url);
        console.log('Error details:', err.message);
        console.log('Error type:', err.type);
        console.log('Error description:', err.description);
    });

    io.use(async (socket, next) => {
        try {
            console.log('Socket authentication attempt from:', socket.handshake.address);
            console.log('Headers present:', Object.keys(socket.handshake.headers));

            // Get cookies from the socket request
            const cookies = socket.handshake.headers.cookie;
            if (!cookies) {
                console.log('Socket auth failed: no cookies provided');
                console.log('Available headers:', socket.handshake.headers);
                return next(new Error('Authentication Error: No authentication cookie'));
            }

            console.log('Raw cookies received:', cookies);

            const parseCookies = (cookieString) => {
                const cookies = {};
                if (!cookieString) return cookies;

                cookieString.split(';').forEach(cookie => {
                    const parts = cookie.trim().split('=');
                    if (parts.length >= 2) {
                        const name = parts[0].trim();
                        const value = parts.slice(1).join('='); // Handle values with = in them
                        try {
                            cookies[name] = decodeURIComponent(value);
                        } catch (e) {
                            // If decoding fails, use raw value
                            cookies[name] = value;
                        }
                    }
                });
                return cookies;
            };

            const parsedCookies = parseCookies(cookies);
            console.log('Parsed cookies:', Object.keys(parsedCookies));

            const token = parsedCookies.token || parsedCookies.authToken;

            if (!token) {
                console.log('Socket auth failed: no token cookie found');
                console.log('Available cookie names:', Object.keys(parsedCookies));
                return next(new Error('Authentication Error: Token cookie required'));
            }

            console.log('Token found, verifying...');

            // Verify the JWT token
            const payload = verifyToken(token);
            const { id, role, exp } = payload;

            console.log('Token verified for user:', id, 'role:', role);

            // Check if token is expired
            if (exp && Date.now() >= exp * 1000) {
                console.log('Socket auth failed: token expired');
                return next(new Error('Authentication Error: Token expired'));
            }

            //user verification
            try {
                const User = require('../models/User');
                const user = await User.findById(id).select('_id role isActive userName');
                if (!user) {
                    console.log('Socket auth failed: user not found in database');
                    return next(new Error('Authentication Error: User not found'));
                }

                if (!user.isActive) {
                    console.log('Socket auth failed: user is inactive');
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

                console.log(`Socket authenticated successfully: user ${id} (${user.userName}), role ${role}`);
                next();

            } catch (dbError) {
                console.error('Database error during socket auth:', dbError);
                return next(new Error('Authentication Error: Database verification failed'));
            }

        } catch (err) {
            console.log('Socket auth failed with error:', err.message);
            console.log('Error stack:', err.stack);

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

        // Also remove from typing users
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

    // FIXED: Actually use this function where needed
    const broadcastToTranslation = (translationId, event, data, excludeUserId = null) => {
        const users = getUsersInTranslation(translationId);
        users.forEach(user => {
            if (user.id !== excludeUserId && user.socketId) {
                io.to(user.socketId).emit(event, data);
            }
        });
    };

    io.on('connection', socket => {
        console.log(`Socket connected successfully: user ${socket.user.id} (${socket.user.userName}), role ${socket.user.role}`);

        // Store socket ID for the user
        socket.user.socketId = socket.id;

        // FIXED: Send connection confirmation
        socket.emit('authenticated', {
            userId: socket.user.id,
            userName: socket.user.userName,
            role: socket.user.role
        });

        // Handle joining a translation room
        socket.on('joinTranslation', async (translationId) => {
            try {
                console.log(`User ${socket.user.id} (${socket.user.userName}) joining translation ${translationId}`);

                // Verify translation exists and user has access
                const translation = await Translation.findById(translationId);
                if (!translation) {
                    socket.emit('error', { message: 'Translation not found' });
                    return;
                }

                // Join socket room
                socket.join(`translation:${translationId}`);

                // Add user to active users for this translation
                addUserToTranslation(translationId, {
                    id: socket.user.id,
                    role: socket.user.role,
                    userName: socket.user.userName,
                    socketId: socket.id,
                    joinedAt: new Date()
                });
                try {
                    await EditLog.create({
                        translationId,
                        userId: socket.user.id,
                        action: 'join',
                        payload: { userName: socket.user.userName }
                    });
                } catch (logErr) {
                    console.error('Failed to log join event:', logErr);
                }

                // Get current state
                const currentUsers = getUsersInTranslation(translationId);
                const currentTyping = getTypingUsersInTranslation(translationId);

                // Send current state to the joining user
                socket.emit('activeUsers', {
                    users: currentUsers,
                    typingUsers: currentTyping
                });

                // FIXED: Use broadcastToTranslation function
                broadcastToTranslation(translationId, 'userJoined', {
                    userId: socket.user.id,
                    userName: socket.user.userName,
                    joinedAt: new Date()
                }, socket.user.id);

                // Send updated user list to everyone in the room
                io.to(`translation:${translationId}`).emit('activeUsersUpdate', {
                    activeUsers: currentUsers
                });

                console.log(`User ${socket.user.id} (${socket.user.userName}) successfully joined translation ${translationId}`);
                console.log(`Active users in ${translationId}:`, currentUsers.map(u => u.userName));

            } catch (error) {
                console.error('Error joining translation:', error);
                socket.emit('error', { message: 'Failed to join translation' });
            }
        });

        // Handle leaving a translation room
        socket.on('leaveTranslation', (translationId) => {
            try {
                console.log(`User ${socket.user.id} leaving translation ${translationId}`);

                socket.leave(`translation:${translationId}`);
                removeUserFromTranslation(translationId, socket.user.id);
                EditLog.create({
                    translationId,
                    userId: socket.user.id,
                    action: 'leave',
                    payload: { userName: socket.user.userName }
                }).catch(logErr => {
                    console.error('Failed to log leave event:', logErr);
                });

                // Get remaining users and typing users
                const remainingUsers = getUsersInTranslation(translationId);
                const remainingTyping = getTypingUsersInTranslation(translationId);

                // FIXED: Use broadcastToTranslation function
                broadcastToTranslation(translationId, 'userLeft', {
                    userId: socket.user.id,
                    userName: socket.user.userName,
                    leftAt: new Date()
                }, socket.user.id);

                // Send updated user list to remaining users
                if (remainingUsers.length > 0) {
                    io.to(`translation:${translationId}`).emit('activeUsersUpdate', {
                        activeUsers: remainingUsers
                    });

                    io.to(`translation:${translationId}`).emit('activeUsers', {
                        users: remainingUsers,
                        typingUsers: remainingTyping
                    });
                }

            } catch (error) {
                console.error('Error leaving translation:', error);
            }
        });

        // Handle typing indicators
        socket.on('startTyping', (translationId) => {
            try {
                console.log(`User ${socket.user.id} started typing in ${translationId}`);

                addTypingUser(translationId, socket.user.id);

                // FIXED: Use broadcastToTranslation function
                broadcastToTranslation(translationId, 'userStartedTyping', {
                    userId: socket.user.id,
                    userName: socket.user.userName,
                    timestamp: new Date()
                }, socket.user.id);

            } catch (error) {
                console.error('Error handling start typing:', error);
            }
        });

        socket.on('stopTyping', (translationId) => {
            try {
                console.log(`User ${socket.user.id} stopped typing in ${translationId}`);

                removeTypingUser(translationId, socket.user.id);

                // FIXED: Use broadcastToTranslation function
                broadcastToTranslation(translationId, 'userStoppedTyping', {
                    userId: socket.user.id,
                    userName: socket.user.userName,
                    timestamp: new Date()
                }, socket.user.id);

            } catch (error) {
                console.error('Error handling stop typing:', error);
            }
        });

        // Handle real-time text changes (for operational transform)
        socket.on('textChange', ({ translationId, delta, version }) => {
            try {
                console.log(`Text change in ${translationId} by ${socket.user.id}`);

                // FIXED: Use broadcastToTranslation function
                broadcastToTranslation(translationId, 'textChanged', {
                    userId: socket.user.id,
                    userName: socket.user.userName,
                    delta,
                    version,
                    timestamp: new Date()
                }, socket.user.id);

            } catch (error) {
                console.error('Error handling text change:', error);
            }
        });

        // Handle translation edits/saves
        socket.on('editTranslation', async ({ translationId, newText, version }) => {
            try {
                console.log(`Edit translation ${translationId} by ${socket.user.id}`);

                const translation = await Translation.findById(translationId);
                if (!translation) {
                    socket.emit('error', { message: 'Translation not found' });
                    return;
                }

                // FIXED: Check if addRevision method exists using the method from Translation.js
                if (typeof translation.addRevision !== 'function') {
                    console.error('addRevision method not available on translation object');
                    socket.emit('error', { message: 'Translation update method not available' });
                    return;
                }

                // Check for version conflicts using the method from Translation.js
                if (translation.checkVersionConflict && translation.checkVersionConflict(version)) {
                    console.log(`Version conflict detected: client=${version}, server=${translation.getCurrentVersion()}`);
                    socket.emit('conflictDetected', {
                        translationId,
                        currentVersion: translation.getCurrentVersion(),
                        clientVersion: version,
                        serverText: translation.translatedText
                    });
                    return;
                }

                // Use the addRevision method properly
                await translation.addRevision(newText, socket.user.id);
                try {
                    await EditLog.create({
                        translationId,
                        userId: socket.user.id,
                        action: 'edit',
                        payload: {
                            newText,
                            version,
                            userName: socket.user.userName
                        }
                    });
                } catch (logErr) {
                    console.error('Failed to log edit event:', logErr);
                }

                // Notify all users about the update
                io.to(`translation:${translationId}`).emit('translationUpdated', {
                    translationId,
                    newText,
                    version: translation.getCurrentVersion(),
                    updatedBy: socket.user.id,
                    updatedByName: socket.user.userName,
                    updatedAt: new Date()
                });

                // Confirm edit to the author
                socket.emit('editConfirmed', {
                    translationId,
                    version: translation.getCurrentVersion()
                });

                console.log(`Translation ${translationId} updated to version ${translation.getCurrentVersion()}`);

            } catch (error) {
                console.error('Error editing translation:', error);
                socket.emit('error', { message: 'Failed to save translation: ' + error.message });
            }
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            console.log(`User ${socket.user.id} (${socket.user.userName}) disconnected: ${reason}`);

            // Remove user from all translations they were in
            for (const [translationId, users] of activeUsers.entries()) {
                const userInTranslation = Array.from(users).find(u => u.socketId === socket.id);
                if (userInTranslation) {
                    removeUserFromTranslation(translationId, socket.user.id);

                    // Get remaining users after removal
                    const remainingUsers = getUsersInTranslation(translationId);

                    // FIXED: Use broadcastToTranslation function and check if there are remaining users
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

        // Handle errors
        socket.on('error', (error) => {
            console.error('Socket error for user', socket.user.id, ':', error);
        });
    });

    // Optional: Cleanup inactive users periodically
    setInterval(() => {
        const now = Date.now();
        const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

        for (const [translationId, users] of activeUsers.entries()) {
            const activeUsersArray = Array.from(users);
            const inactiveUsers = activeUsersArray.filter(user => {
                return now - user.joinedAt.getTime() > INACTIVITY_TIMEOUT;
            });

            inactiveUsers.forEach(user => {
                removeUserFromTranslation(translationId, user.id);
                console.log(`Removed inactive user ${user.id} from translation ${translationId}`);
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
    }, 5 * 60 * 1000); // Check every 5 minutes
};