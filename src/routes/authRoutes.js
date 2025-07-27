const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    resetPassword,
    changePassword,
    setNewPassword,
    logoutUser,
    getLanguages,
    getCurrentUser
} = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');
const rateLimit = require('express-rate-limit');
const logActivity = require('../middleware/activityLogger');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: 'Too many login attempts, please try again later.' }
})
const resetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { error: 'Too many password reset requests, please try again later.' }
})

//public routes
router.post('/register', logActivity('register'), registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/resetPassword', resetLimiter, logActivity('reset_password'), resetPassword);
router.post('/setNewPassword', logActivity('set_new_password'), setNewPassword);
router.get('/getLanguages', getLanguages);

router.use(requireAuth);
//protected routes
router.post('/changePassword', requireAuth, logActivity('change_password'), changePassword);
router.get('/logout', requireAuth, logActivity('logout'), logoutUser);
router.get('/me', requireAuth, getCurrentUser);

module.exports = router;