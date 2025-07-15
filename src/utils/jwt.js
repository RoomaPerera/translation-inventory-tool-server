const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config');

function createToken(payload) {
    return jwt.sign(payload, jwtSecret, { expiresIn: '2h' });
}

function verifyToken(token) {
    return jwt.verify(token, jwtSecret);
}

function createShortToken(payload) {
    return jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
}

module.exports = {
    createToken,
    verifyToken,
    createShortToken
};