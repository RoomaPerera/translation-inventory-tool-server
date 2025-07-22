const { verifyToken, createToken } = require('../utils/jwt');
const User = require('../models/User');

//how long before force-logout from idle
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000 // 15min
//hard cap on total session length
const SESSION_EXPIRY_MS = 2 * 60 * 60 * 1000 //2 hours

const requireAuth = async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ mssg: 'Authorization token required' });
    }
    console.log('Raw token:', token);

    let payload;
    try {
        payload = verifyToken(token);
        console.log('Decoded payload:', payload);
    } catch (error) {
        console.log('JWT verify error: ', error.message);
        res.status(401).json({ error: 'Request is not Authorized' });
    }

    //enforce inactivity and absolute session expiry
    const issuedAtMs = payload.iat * 1000;
    const nowMs = Date.now();
    const idleMs = nowMs - issuedAtMs;
    const ageMs = nowMs - issuedAtMs;

    if (idleMs > INACTIVITY_LIMIT_MS || ageMs > SESSION_EXPIRY_MS) {
        console.log(`Session expired: idle=${idleMs}ms age=${ageMs}ms`);
        return res.status(401).json({ error: 'Session expired due to inactivity' })
    }
    try {
        const user = await User.findById(payload.id).select('_id role');
        if (!user) {
            console.log('User not found for payload.id:', payload.id);
            return res.status(401).json({ error: 'User not found' });
        }
        const now = Date.now();
        const elapsed = now - new Date(user.lastActivity).getTime();
        if (elapsed > INACTIVITY_LIMIT_MS) {
            return res.status(401).json('Session Expired due to inactivity');
        }
        user.lastActivity = now;
        await user.save();
        req.user = { id: user._id, role: user.role };
        const newToken = createToken({ id: user._id, role: user.role });
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: SESSION_EXPIRY_MS
        })
        next();
    } catch (error) {
        console.log('Error loading user or issuing new token:', error.message);
        return res.status(500).json({ error: 'Server error during authentication' });
    }
}

module.exports = requireAuth;