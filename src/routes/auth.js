// routes/auth.js
const express = require('express');
const authController = require('../controllers/authController');
const logActivity = require('../middleware/activityLogger');

const router = express.Router();

// Register route
router.post('/register', logActivity('register'), authController.registerUser);

// Login route
router.post('/login', logActivity('login'), authController.loginUser);

// Logout route
router.post('/logout', logActivity('logout'), authController.logoutUser);

// Password reset (forgot password)
router.post('/resetPassword', authController.resetPassword);

// Set new password (from reset link)
router.post('/setNewPassword', authController.setNewPassword);

// Change password (for logged-in users)
router.post('/changePassword', logActivity('change_password'), authController.changePassword);

// Get available languages
router.get('/getLanguages', authController.getLanguages);

module.exports = router; 