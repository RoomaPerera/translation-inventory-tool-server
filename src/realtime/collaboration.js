const Translation = require('../models/Translation');
const editLog = require('../models/editLog');
const { verifyToken } = require('../utils/jwt');

module.exports = function (io) {
    // Store active users and their typing status per translation
    const activeUsers = new Map(); // translationId -> Set of user objects
    const typingUsers = new Map(); // translationId -> Set of userIds currently typing

    io.engine.on('connection_error', (err) => {
        console.log('Engine connection_error:', err);
    });

    // Authentication middleware for sockets
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            console.log('Socket auth failed: no token provided');
            return next(new Error('Authentication Error: Token required'));
        }
        try {
            const { id, role, exp } = verifyToken(token);
            socket.user = { id, role, exp };
            next();
        } catch (err) {
            console.log('Socket auth failed: ', err.message);
            return next(new Error('Authentication Error: ' + err.message));
        }
    });

    // Utility function to get active users for a translation
    const getActiveUsers = (translationId) => {
        return Array.from(activeUsers.get(translationId) || []);
    };

    // Utility function to get typing users for a translation
    const getTypingUsers = (translationId) => {
        return Array.from(typingUsers.get(translationId) || []);
    };

    // Handle socket connections
    io.on('connection', socket => {
        console.log(`Socket connected: user ${socket.user.id}, role ${socket.user.role}`);

        // Join translation room
        socket.on('joinTranslation', async (translationId) => {
            try {
                socket.join(translationId);

                // Add user to active users
                if (!activeUsers.has(translationId)) {
                    activeUsers.set(translationId, new Set());
                }
                activeUsers.get(translationId).add({
                    id: socket.user.id,
                    socketId: socket.id,
                    joinedAt: new Date()
                });

                // Create audit log
                await editLog.create({
                    translationId: translationId,
                    userId: socket.user.id,
                    action: 'join',
                    payload: {},
                });

                // Notify others and send current active users
                const currentUsers = getActiveUsers(translationId);

                socket.to(translationId).emit('userJoined', {
                    userId: socket.user.id,
                    joinedAt: new Date()
                });

                // Send current active users to the newly joined user
                socket.emit('activeUsers', {
                    users: currentUsers,
                    typingUsers: getTypingUsers(translationId)
                });

                // Update active users list for all users in the room
                io.to(translationId).emit('activeUsersUpdate', {
                    activeUsers: currentUsers.map(u => ({ id: u.id, joinedAt: u.joinedAt }))
                });

            } catch (err) {
                console.log('Join translation error:', err);
                socket.emit('error', { message: 'Failed to join translation' });
            }
        });

        // Leave translation room
        socket.on('leaveTranslation', async (translationId) => {
            try {
                socket.leave(translationId);

                // Remove user from active users
                if (activeUsers.has(translationId)) {
                    const users = activeUsers.get(translationId);
                    const userToRemove = Array.from(users).find(u => u.socketId === socket.id);
                    if (userToRemove) {
                        users.delete(userToRemove);
                        if (users.size === 0) {
                            activeUsers.delete(translationId);
                        }
                    }
                }

                // Remove from typing users
                if (typingUsers.has(translationId)) {
                    typingUsers.get(translationId).delete(socket.user.id);
                    if (typingUsers.get(translationId).size === 0) {
                        typingUsers.delete(translationId);
                    }
                }

                await editLog.create({
                    translationId: translationId,
                    userId: socket.user.id,
                    action: 'leave',
                    payload: {}
                });

                socket.to(translationId).emit('userLeft', {
                    userId: socket.user.id,
                    leftAt: new Date()
                });

                // Update active users for remaining users
                const remainingUsers = getActiveUsers(translationId);
                socket.to(translationId).emit('activeUsersUpdate', {
                    activeUsers: remainingUsers.map(u => ({ id: u.id, joinedAt: u.joinedAt }))
                });

            } catch (err) {
                console.log('Leave translation error:', err);
            }
        });

        // Handle typing indicators
        socket.on('startTyping', (translationId) => {
            if (!typingUsers.has(translationId)) {
                typingUsers.set(translationId, new Set());
            }
            typingUsers.get(translationId).add(socket.user.id);

            socket.to(translationId).emit('userStartedTyping', {
                userId: socket.user.id,
                timestamp: new Date()
            });
        });

        socket.on('stopTyping', (translationId) => {
            if (typingUsers.has(translationId)) {
                typingUsers.get(translationId).delete(socket.user.id);
                if (typingUsers.get(translationId).size === 0) {
                    typingUsers.delete(translationId);
                }
            }

            socket.to(translationId).emit('userStoppedTyping', {
                userId: socket.user.id,
                timestamp: new Date()
            });
        });

        // Handle real-time text changes (for conflict resolution)
        socket.on('textChange', ({ translationId, delta, version }) => {
            // Broadcast text changes to other users for real-time sync
            socket.to(translationId).emit('textChanged', {
                userId: socket.user.id,
                delta,
                version,
                timestamp: new Date()
            });
        });

        // Handle final translation edits (when user stops editing)
        socket.on('editTranslation', async ({ translationId, newText, version }) => {
            try {
                const translation = await Translation.findById(translationId);
                if (!translation) {
                    return socket.emit('error', { message: 'Translation not found' });
                }

                // Simple conflict resolution: check version
                if (version && translation.version && version < translation.version) {
                    return socket.emit('conflictDetected', {
                        translationId,
                        currentVersion: translation.version,
                        clientVersion: version,
                        serverText: translation.text
                    });
                }

                await translation.addRevision(newText, socket.user.id);

                await editLog.create({
                    translationId: translationId,
                    userId: socket.user.id,
                    action: 'edit',
                    payload: {
                        newText,
                        previousVersion: version,
                        newVersion: translation.version
                    }
                });

                // Broadcast final update to other collaborators
                socket.to(translationId).emit('translationUpdated', {
                    translationId,
                    newText,
                    version: translation.version,
                    updatedBy: socket.user.id,
                    updatedAt: new Date()
                });

                // Confirm update to sender
                socket.emit('editConfirmed', {
                    translationId,
                    version: translation.version
                });

            } catch (err) {
                console.log('Edit error:', err);
                socket.emit('error', { message: 'Failed to save translation' });
            }
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            console.log(`Socket disconnected: user ${socket.user.id}, reason: ${reason}`);

            // Clean up user from all active translations
            for (const [translationId, users] of activeUsers.entries()) {
                const userToRemove = Array.from(users).find(u => u.socketId === socket.id);
                if (userToRemove) {
                    users.delete(userToRemove);
                    if (users.size === 0) {
                        activeUsers.delete(translationId);
                    }

                    // Remove from typing users
                    if (typingUsers.has(translationId)) {
                        typingUsers.get(translationId).delete(socket.user.id);
                        if (typingUsers.get(translationId).size === 0) {
                            typingUsers.delete(translationId);
                        }
                    }

                    // Notify other users
                    socket.to(translationId).emit('userLeft', {
                        userId: socket.user.id,
                        leftAt: new Date()
                    });

                    const remainingUsers = getActiveUsers(translationId);
                    socket.to(translationId).emit('activeUsersUpdate', {
                        activeUsers: remainingUsers.map(u => ({ id: u.id, joinedAt: u.joinedAt }))
                    });
                }
            }
        });
    });
};