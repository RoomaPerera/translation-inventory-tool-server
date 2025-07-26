//middleware/requireAuth.js

const jwt = require('jsonwebtoken');
const { verifyToken, createToken } = require('../utils/jwt');
const User = require('../models/User');

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

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

  let payload;
  try {
    payload = verifyToken(token);
    console.log('Decoded payload:', payload);
  } catch (error) {
    console.log('JWT verify error:', error.message);
    return res.status(401).json({ error: 'Request is not Authorized' });
  }

  const issuedAtMs = payload.iat * 1000;
  const nowMs = Date.now();
  const idleMs = nowMs - issuedAtMs;

  if (idleMs > INACTIVITY_LIMIT_MS) {
    console.log(`Session expired: idle=${idleMs}ms`);
    return res.status(401).json({ error: 'Session expired due to inactivity' });
  }

  const expiryMs = issuedAtMs + SESSION_EXPIRY_MS;
  if (nowMs > expiryMs) {
    return res.status(401).json({ error: 'Session expired' });
  }

  try {
    const user = await User.findById(payload.id).select('_id role');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = { id: user._id, role: user.role };

    const newToken = createToken({ id: user._id, role: user.role });
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: SESSION_EXPIRY_MS,
    });

    next();
  } catch (error) {
    console.log('Error loading user or issuing new token:', error.message);
    return res.status(500).json({ error: 'Server error during authentication' });
  }
  
};

const requireAu = async (req, res, next) => {
    const { authorization } = req.headers;

    if (!authorization) {
        return res.status(401).json({ mssg: 'Authorization token required' });
    }

    const token = authorization.split(' ')[1];

    try {
        const { id } = jwt.verify(token, process.env.jwt_SECRET);

        const user = await User.findById(id).select('_id');
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.log(error);
        res.status(401).json({ error: 'Request is not Authorized' });
    }
};





module.exports = requireAuth;
module.exports = requireAu;
