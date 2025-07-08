const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
    const { authorization } = req.headers;
    console.log('Auth header:', authorization);

    if (!authorization) {
        return res.status(401).json({ mssg: 'Authorization token required' });
    }
    const token = authorization.split(' ')[1];
    console.log('Raw token:', token);

    try {
        const payload = verifyToken(token);
        console.log('Decoded payload:', payload);
        const user = await User.findById(payload.id).select('_id role');
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = { id: user._id, role: user.role };
        next();
    } catch (error) {
        console.log('JWT verify error: ', error.message);
        res.status(401).json({ error: 'Request is not Authorized' });
    }
}

module.exports = requireAuth;