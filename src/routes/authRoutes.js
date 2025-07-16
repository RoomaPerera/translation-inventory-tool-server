const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    resetPassword,
    changePassword,
    setNewPassword,
    logoutUser,
    getLanguages
} = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts, please try again later.' }
})
const resetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { error: 'Too many password reset requests, please try again later.' }
})

//public routes
router.post('/register', registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/resetPassword', resetLimiter, resetPassword);
router.post('/setNewPassword', setNewPassword);
router.get('/getLanguages', getLanguages);

//protected routes
router.post('/changePassword', requireAuth, changePassword);
router.get('/logout', requireAuth, logoutUser);

module.exports = router;