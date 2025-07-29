// handles user authentication, registration, and password workflow
const {User} = require('../models/User');
const bcrypt = require('bcrypt');
const BlockedIP = require('../models/BlockedIP');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// const createShortToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '2h' });

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
const UserActivity = require('../models/UserActivity');



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
    // --- IP BLOCK CHECK ---
    const ip = req.ip || req.connection.remoteAddress;
    const blocked = await BlockedIP.findOne({ ip });
    if (blocked) {
        return res.status(403).json({ error: 'Your IP is blocked.' });
    }
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
        console.error('[registerUser] Error:', error.message, error.stack);
        res.status(400).json({ error: error.message || 'Registration failed' });
        console.error('[registerUser] Error:', error.message, error.stack);
        res.status(400).json({ error: error.message || 'Registration failed' });
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT
 */
// const loginUser = async (req, res) => {
//   console.log('Login request body:', req.body);  // log input
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ error: 'Email and password are required' });
//   }

//   try {
//     const user = await User.login(email, password);
//     const token = createToken(user._id,process.env.SECRET, '1h');

//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'Strict',
//       maxAge: 2 * 60 * 60 * 1000,
//     }).status(200).json({
//       email: user.email,
//       userName: user.userName,
//       role: user.role,
//       token
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(400).json({ error: error.message });
//   }
// };
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    // --- IP BLOCK CHECK ---
    const ip = req.ip || req.connection.remoteAddress;
    const blocked = await BlockedIP.findOne({ ip });
    if (blocked) {
        return res.status(403).json({ error: 'Your IP is blocked.' });
    }
    try {
        const user = await User.login(email, password);
        user.lastActivity = Date.now();
        await user.save();
        user.lastActivity = Date.now();
        await user.save();
        const token = createToken({ id: user._id, role: user.role });
        
        // Prepare user object for frontend
        const userData = {
            _id: user._id,
            userName: user.userName,
            email: user.email,
            role: user.role,
            languages: user.languages || [],
            lastLogin: user.lastLogin,
            roleStatus: user.roleStatus,
            isActive: user.isActive,
        };
        
        
        // Log successful login
        try {
            await UserActivity.create({
                user: user._id,
                type: 'login',
                success: true,
                ip,
                details: { email }
            });
            console.log(`Successful login logged for user: ${email}`);
        } catch (activityErr) {
            console.error('Error logging successful login:', activityErr);
        }

        // Send token as an HTTP-only secure cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
            maxAge: 2 * 60 * 60 * 1000
        }).status(200).json({
            user: userData,
            token,
            message: 'Login successful'
        });

    } catch (error) {
        console.log(`Login failed for email: ${email}, error: ${error.message}`);
        
        // Log failed login
        try {
            await UserActivity.create({
                user: null,
                type: 'failed_login',
                success: false,
                ip,
                details: { email, error: error.message }
            });
            console.log(`Failed login logged for email: ${email}`);
        } catch (activityErr) {
            console.error('Error logging failed login:', activityErr);
        }
        
        res.status(400).json({ error: error.message });
    }
};


/**
 * @route   GET /api/auth/me
 * @desc    Get current user info (verify authentication)
 */
const getCurrentUser = async (req, res) => {
    try {
        // req.user is set by requireAuth middleware
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            user: {
                id: user._id,
                email: user.email,
                userName: user.userName,
                role: user.role,
                // Include any other user fields you need on the frontend
                languages: user.languages
            }
        });
    } catch (error) {
        console.error('getCurrentUser error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @route   POST /api/auth/resetPassword
 * @desc    Send short-lived reset link email - Forgot Password
 */
// const resetPassword = async (req, res) => {
//     const { email } = req.body;
//     const user = await User.findOne({ email });
//     if (!user) {
//         return res.status(404).json({ error: 'No account with that email' });
//     }

//     const resetToken = createShortToken({
//         id: user._id.toString(),
//         role: user.role,
//         version: user.resetTokenVersion
//     });
//     const resetURL = `${frontendURL}/reset-password?token=${resetToken}`;

//     const html = resetPasswordTemplate({
//         userName: user.userName,
//         resetURL,
//         expiryMinutes: PASSWORD_RESET_EXPIRY_MINUTES
//     });

//     await sendMail({
//         to: user.email,
//         subject: 'Password Reset Link',
//         html,
//     });
//     res.json({ message: MSG_PASSWORD_RESET_SENT });
// };

/**
 * @route   POST /api/auth/setNewPassword
 * @desc    Verify reset token and update password - Forgot Password
 */
// const setNewPassword = async (req, res) => {
//     const { token, newPassword, confirmPassword } = req.body;
//     if (newPassword != confirmPassword) {
//         return res.status(400).json({ error: 'Passwords do not match.' });
//     }
//     try {
//         const payload = verifyToken(token);
//         const user = await User.findById(payload.id);
//         if (!user) throw Error('Invalid token or user');

//         //one time use check
//         if (payload.version !== user.resetTokenVersion) {
//             throw Error('This reset link has already been used.');
//         }

//         //strength check
//         const emailLocal = user.email.split('@')[0];
//         const pwCheck = isStrongPassword(newPassword, emailLocal);
//         if (!pwCheck.valid) {
//             return res.status(400).json({ error: pwCheck.message });
//         }

//         //hash and save
//         const salt = await bcrypt.genSalt(10);
//         user.password = await bcrypt.hash(newPassword, salt);
//         user.resetTokenVersion += 1;
//         await user.save();

//         res.json({ message: 'Password has been reset' });
//     } catch (error) {
//         if (error.name === 'TokenExpiredError') {
//             return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' })
//         }
//         if (error.name === 'JsonWebTokenError') {
//             return res.status(400).json({ error: 'Invalid reset link. Please request a new one.' })
//         }
//         return res.status(400).json({ error: error.message });
//     }
// };

/**
 * @route   POST /api/auth/changePassword
 * @desc    Change password for logged-in users
 */
// const changePassword = async (req, res) => {
//     const { oldPassword, newPassword, confirmPassword } = req.body;
//     const user = await User.findById(req.user.id);
//     if (!user) {
//         return res.status(404).json({ error: 'User not found' });
//     }

//     const match = await bcrypt.compare(oldPassword, user.password);
//     if (!match) {
//         return res.status(400).json({ error: 'Old password incorrect' });
//     }

//     if (newPassword !== confirmPassword) {
//         return res.status(400).json({ error: 'Passwords do not match.' });
//     }

//     //strength check
//     const emailLocal = user.email.split('@')[0];
//     const pwCheck = isStrongPassword(newPassword, emailLocal);
//     if (!pwCheck.valid) {
//         return res.status(400).json({ error: pwCheck.message });
//     }

//     const salt = await bcrypt.genSalt(10);
//     user.password = await bcrypt.hash(newPassword, salt);
//     await user.save();
//     res.json({ message: MSG_PASSWORD_CHANGED });
// };

// Forgot Password: Send OTP and resetToken via email
const forgotPassword = async (req, res) => {
const { email } = req.body;
try {
    if (!email) throw new Error('Email is required');

    const user = await User.findOne({ email });
    if (!user || user.roleStatus !== 'Approved') {
    throw new Error('User not found or not approved');
    }
    
    const resetToken = createShortToken(user._id, process.env.RESET_SECRET, '10h');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetPasswordToken = resetToken;
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = Date.now() + 600 * 1000; // 10 minutes 
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
const resetPasswordWithToken = async (req, res) => {
const { otp, newPassword, confirmPassword, token } = req.body;

try {
    
    if (!token || !otp || !newPassword || !confirmPassword) {
    throw new Error('All fields are required.');
    }
    if (newPassword !== confirmPassword) {
    throw new Error('Passwords do not match.');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) throw new Error('User not found');
    if (user.resetPasswordOtp !== otp) throw new Error('Invalid OTP');
    if (user.resetPasswordExpires < Date.now()) throw new Error('OTP has expired');

    user.password = newPassword; // hashed by pre-save
    user.resetPasswordToken = null;
    user.resetPasswordOtp = null;
    user.resetPasswordExpires = null;

    // Check password strength
    const emailLocalPart = user.email.split('@')[0];
    const pwCheck = isStrongPassword(newPassword, emailLocalPart);
    if (!pwCheck.valid) {
    throw new Error(pwCheck.message || 'Password is not strong enough.');
    }

    await user.save();

    res.status(200).json({ message: 'Password updated successfully.' });
} catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ error: error.message });
}
};

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

    const emailLocalPart = email.split('@')[0];
    const pwCheck = isStrongPassword(newPassword, emailLocalPart);
    if (!pwCheck.valid) {
    throw new Error(pwCheck.message || 'Password is not strong enough.');
    }

    user.password = newPassword; 
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


const logoutUser = async (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        path: '/'
    }).json({ message: 'Logged out successfully' });
};

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
    // resetPassword,
    // setNewPassword,
    // changePassword,
    forgotPassword,
    verifyOtp,
    resetPasswordWithToken,
    resetPassword,
    deleteAccount,
    logoutUser,
    getLanguages,
    getCurrentUser
};
