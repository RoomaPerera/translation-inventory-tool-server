const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  forgotPassword,
  verifyOtp,
  deleteAccount,
  resetPasswordWithToken,
  resetPassword
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.delete('/delete-account', deleteAccount);
router.post('/reset-password/:token', resetPasswordWithToken);
router.post('/reset-password', resetPassword);

module.exports = router;
