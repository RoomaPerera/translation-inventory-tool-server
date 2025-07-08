// handles user authentication, registration, and password workflow

const User = require('../models/User');
const bcrypt = require('bcrypt');
const {
    createToken,
    createShortToken,
    verifyToken
} = require('../utils/jwt');
const { sendMail } = require('../utils/mailer');
const { resetPasswordTemplate } = require('../utils/emailTemplates');

// Constants for expiry and messages
const PASSWORD_RESET_EXPIRY_MINUTES = 15;
const MSG_PASSWORD_RESET_SENT = 'Reset email sent. Please check your inbox.';
const MSG_PASSWORD_CHANGED = 'Password successfully changed';

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (pending approval)
 */
const registerUser = async (req, res) => {
    const { userName, email, password, role, languages } = req.body;
    try {
        await User.register(userName, email, password, role, languages);
        res.status(200).json({ message: 'Send to Approval' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT
 */
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.login(email, password);
        const token = createToken({ id: user._id, role: user.role });
        res.status(200).json({ email, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * @route   POST /api/auth/resetPassword
 * @desc    Send short-lived reset link email
 */
const resetPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ error: 'No account with that email' });
    }

    const resetToken = createShortToken({ id: user._id, role: user.role });
    const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = resetPasswordTemplate({
        userName: user.userName,
        resetURL,
        expiryMinutes: PASSWORD_RESET_EXPIRY_MINUTES
    });

    await sendMail({
        to: user.email,
        subject: 'Password Reset Link',
        html,
    });
    res.json({ message: MSG_PASSWORD_RESET_SENT });
};

/**
 * @route   POST /api/auth/setNewPassword
 * @desc    Verify reset token and update password
 */
const setNewPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const { id } = verifyToken(token);
        const user = await User.findById(id);
        if (!user) throw Error('Invalid token or user');

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password has been reset' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * @route   POST /api/auth/changePassword
 * @desc    Change password for logged-in users
 */
const changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
        return res.status(400).json({ error: 'Old password incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: MSG_PASSWORD_CHANGED });
};

module.exports = {
    registerUser,
    loginUser,
    resetPassword,
    setNewPassword,
    changePassword
};