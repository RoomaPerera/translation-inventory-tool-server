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
const { getAllowedLanguageCodes } = require('../utils/languageHelper');
const { isStrongPassword } = require('../models/User');
const { frontendURL } = require('../config/config');
const Language = require('../models/Language');

// Constants for expiry and messages
const PASSWORD_RESET_EXPIRY_MINUTES = 15;
const MSG_PASSWORD_RESET_SENT = 'Reset email sent. Please check your inbox.';
const MSG_PASSWORD_CHANGED = 'Password successfully changed';
const ALLOWED_SELF_ROLES = ['Translator', 'Developer', 'Admin'];

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (pending approval)
 */
const registerUser = async (req, res) => {
    console.log('[registerUser] req.body =', req.body);
    const { userName, email, password, role, languages } = req.body;
    if (!ALLOWED_SELF_ROLES.includes(role)) {
        return res.status(400).json({ error: `You may only self‑register as: ${ALLOWED_SELF_ROLES.join(', ')}` });
    }

    //if Translator, validate languages
    if (role == 'Translator') {
        if (!Array.isArray(languages) || languages.length === 0) {
            return res.status(400).json({ error: 'Translators must select at least one language.' });
        }
        const uniqueCodes = [...new Set(languages.map(l => l.trim().toUpperCase()))];
        const allowed = await getAllowedLanguageCodes();
        const invalid = uniqueCodes.filter(c => !allowed.includes(c));
        if (invalid.length) {
            return res.status(400).json({ error: `Invalid language codes: ${invalid.join(', ')}.` });
        }
        req.body.languages = uniqueCodes;
    } else {
        delete req.body.languages;
    }

    //user name length
    if (userName.trim().length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long.' })
    }
    const cleanLanguages = Array.isArray(languages)
        ? languages.filter(l => typeof l === 'string' && l.trim() !== '')
        : [];
    try {
        await User.register(userName.trim(), email.trim(), password, role, cleanLanguages);
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
        // send token as HTTP only secure cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 2 * 60 * 60 * 1000 //2 hours in ms
        }).status(200).json({ email });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * @route   POST /api/auth/resetPassword
 * @desc    Send short-lived reset link email - Forgot Password
 */
const resetPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ error: 'No account with that email' });
    }

    const resetToken = createShortToken({
        id: user._id.toString(),
        role: user.role,
        version: user.resetTokenVersion
    });
    const resetURL = `${frontendURL}/reset-password?token=${resetToken}`;

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
 * @desc    Verify reset token and update password - Forgot Password
 */
const setNewPassword = async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;
    if (newPassword != confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }
    try {
        const payload = verifyToken(token);
        const user = await User.findById(payload.id);
        if (!user) throw Error('Invalid token or user');

        //one time use check
        if (payload.version !== user.resetTokenVersion) {
            throw Error('This reset link has already been used.');
        }

        //strength check
        const emailLocal = user.email.split('@')[0];
        const pwCheck = isStrongPassword(newPassword, emailLocal);
        if (!pwCheck.valid) {
            return res.status(400).json({ error: pwCheck.message });
        }

        //hash and save
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetTokenVersion += 1;
        await user.save();

        res.json({ message: 'Password has been reset' });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' })
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({ error: 'Invalid reset link. Please request a new one.' })
        }
        return res.status(400).json({ error: error.message });
    }
};

/**
 * @route   POST /api/auth/changePassword
 * @desc    Change password for logged-in users
 */
const changePassword = async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
        return res.status(400).json({ error: 'Old password incorrect' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }

    //strength check
    const emailLocal = user.email.split('@')[0];
    const pwCheck = isStrongPassword(newPassword, emailLocal);
    if (!pwCheck.valid) {
        return res.status(400).json({ error: pwCheck.message });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: MSG_PASSWORD_CHANGED });
};

const logoutUser = async (req, res) => {
    res.
        clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV == 'production',
            sameSite: 'Strict',
            path: '/'
        }).json({ message: 'Logged out successfully' });
}

const getLanguages = async (req, res) => {
    try {
        const langs = await Language.find({}, 'code name').lean();
        const languages = langs.map(({ code, name }) => ({ code, name }));
        return res.status(200).json({ languages });
    } catch (error) {
        console.error('Error fetching languages:', error);
        return res.status(500).json({ error: 'Could not load languages' })
    }
}

module.exports = {
    registerUser,
    loginUser,
    resetPassword,
    setNewPassword,
    changePassword,
    logoutUser,
    getLanguages
};
