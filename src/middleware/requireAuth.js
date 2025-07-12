const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
    const { authorization } = req.headers;

    if (!authorization) {
        return res.status(401).json({ mssg: 'Authorization token required' });
    }

    const token = authorization.split(' ')[1];

    try {
        const { id } = jwt.verify(token, process.env.SECRET);

        console.log('Decoded token ID:', id);

        const user = await User.findOne({ _id: id }).select('_id');

        console.log('User:', user);

        if (!user) {
            return res.status(401).json({ message: 'User not found or unauthorized' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('JWT verification error:', error.message);
        res.status(401).json({ message: 'Request is not authorized' });
    }
};

module.exports = requireAuth;



