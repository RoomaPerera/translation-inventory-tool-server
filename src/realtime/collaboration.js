const Translation = require('../models/Translation');
const editLog = require('../models/editLog');
const { verifyToken } = require('../utils/jwt');

module.exports = function (io) {
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

    // handling each new socket connection
    io.on('connection', socket => {
        console.log(`Socket connected: user ${socket.user.id}, role ${socket.user.role}`);
        socket.on('joinTranslation', translationId => {
            socket.join(translationId);
            // audit log for join
            editLog.create({
                translation: translationId,
                userId: socket.user.id,
                action: 'join',
                payload: {},
            }).catch(err => console.log('editing log join error: ', err));
            socket.to(translationId).emit('userJoined', {
                userId: socket.user.id,
                joinedAt: new Date()
            });
        });
        // leave the room
        socket.on('leaveTranslation', translationId => {
            socket.leave(translationId);
            editLog.create({
                translationId: translationId,
                user: socket.user.id,
                action: 'leave',
                payload: {}
            }).catch(err => console.log('editing log leave error: ', err));
            socket.to(translationId).emit('userLeft', {
                userId: socket.user.id,
                leftAt: new Date()
            });
        });

        // handling edits
        socket.on('editTranslation', async ({ translationId, newText }) => {
            try {
                const t = await Translation.findById(translationId);
                if (!t) return;
                await t.addRevision(newText, socket.user.id);
                await editLog.create({
                    translation: translationId,
                    user: socket.user.id,
                    action: 'edit',
                    payload: { newText }
                });
                // Broadcast update to other collaborators
                socket.to(translationId).emit('translationUpdated', {
                    translationId,
                    newText,
                    updatedBy: socket.user.id,
                    updatedAt: new Date()
                });
            } catch (err) {
                console.log('Edit error:', err);
            }
        });
        socket.on('disconnect', reason => {
            console.log(`Socket disconnected: user ${socket.user.id}, reason: ${reason}`);
        });
    });
}