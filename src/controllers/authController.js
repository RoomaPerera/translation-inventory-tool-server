const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

// Create JWT token
const createToken = (id, secret, expiresIn) => jwt.sign({ id }, secret, { expiresIn });

// Register User
const registerUser = async (req, res) => {
  const { userName, email, password, role, languages } = req.body;
  try {
    const user = await User.register(userName, email, password, role, languages);
    res.status(200).json({ message: 'Send to Approval' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Login User
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) throw new Error('Email and password are required');

    const user = await User.login(email, password);
    const token = createToken(user._id, process.env.SECRET, '1h');

    res.status(200).json({
      token,
      user: {
        userName: user.userName || user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Forgot Password: Send OTP and resetToken via email
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) throw new Error('Email is required');

    const user = await User.findOne({ email });
    if (!user || user.roleStatus !== 'Approved') {
      throw new Error('User not found or not approved');
    }

    const resetToken = createToken(user._id, process.env.RESET_SECRET, '10h');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetPasswordToken = resetToken;
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: 'OTP sent to your email.',
      resetToken,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    if (!email || !otp) throw new Error('Email and OTP are required');

    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');
    if (user.resetPasswordOtp !== otp) throw new Error('Invalid OTP');
    if (user.resetPasswordExpires < Date.now()) throw new Error('OTP has expired');

    res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Reset password using token and OTP
const resetPasswordWithToken = async (req, res) => {
  const { token } = req.params;
  const { otp, newPassword, confirmPassword } = req.body;

  try {
    if (!token || !otp || !newPassword || !confirmPassword) {
      throw new Error('All fields are required.');
    }
    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    const decoded = jwt.verify(token, process.env.RESET_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) throw new Error('User not found');
    if (user.resetPasswordOtp !== otp) throw new Error('Invalid OTP');
    if (user.resetPasswordExpires < Date.now()) throw new Error('OTP has expired');

    user.password = newPassword; // hashed by pre-save
    user.resetPasswordToken = null;
    user.resetPasswordOtp = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Reset password with old password (logged-in user)
const resetPassword = async (req, res) => {
  const { email, oldPassword, newPassword, confirmPassword } = req.body;
  try {
    if (!email || !oldPassword || !newPassword || !confirmPassword) {
      throw new Error('All fields must be filled.');
    }
    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found.');

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) throw new Error('Incorrect old password.');

    user.password = newPassword; // hashed by pre-save
    await user.save();

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete account
const deleteAccount = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Incorrect password.');

    await User.deleteOne({ _id: user._id });

    res.status(200).json({ message: 'Account deleted successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPasswordWithToken,
  resetPassword,
  deleteAccount,
};
