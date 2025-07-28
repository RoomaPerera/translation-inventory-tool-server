const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config');

function createToken(payload) {
    return jwt.sign(payload, jwtSecret, { expiresIn: '0.5h' });
}

function verifyToken(token) {
    return jwt.verify(token, jwtSecret);
}

function createShortToken(id) {
    return jwt.sign({id},process.env.JWT_SECRET , { expiresIn: '15m' });
}

module.exports = {
    createToken,
    verifyToken,
    createShortToken
};