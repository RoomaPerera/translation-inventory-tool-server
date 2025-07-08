const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    resetPassword,
    changePassword,
    setNewPassword
} = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');

//public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/resetPassword', resetPassword);
router.post('/setNewPassword', setNewPassword);

//protected routes
router.post('/changePassword', requireAuth, changePassword);

module.exports = router;