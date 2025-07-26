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
router.post('/resetPassword', resetLimiter, resetPassword);
router.post('/setNewPassword', setNewPassword);
router.get('/getLanguages', getLanguages); // Public for registration form

//protected routes
router.use(requireAuth); // All routes below this are protected

router.post('/logout', logActivity('logout'), logoutUser);
router.post('/changePassword', logActivity('change_password'), changePassword);
router.get('/me', getCurrentUser); // To verify and refresh token

module.exports = router;