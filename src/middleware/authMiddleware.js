// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
try {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized - No Token Provided' });

    const decoded = jwt.verify(token, process.env.SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'Unauthorized - User Not Found' });

    req.user = user;
    next();
} catch (error) {
    res.status(401).json({
    error: error.message.includes('expired') ? 'Token Expired' : 'Invalid Token',
    });
}
};

module.exports = { authMiddleware };
