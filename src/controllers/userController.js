// Admin level user management: approval, language updates, deletion, listing
const { User } = require('../models/User');
const UserActivity = require('../models/UserActivity');
const mongoose = require('mongoose');
const { getAllowedLanguageCodes } = require('../utils/languageHelper')
const { sendMail } = require('../utils/mailer');
const { approvalTemplate, rejectionTemplate } = require('../utils/emailTemplates')
const adminAudit = require('../models/adminAudit');
const { frontendURL } = require('../config/config');
const { notifyLanguageAssignment } = require('../utils/notificationService');

//Role status constants
const ROLE_STATUS = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
};

// Approve or reject a user
const approveUser = async (req, res) => {
    const { id } = req.params;
    const { approve } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid User ID' });
    };

    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    console.log('userId received =', id);
    console.log('Valid ObjectId =', mongoose.Types.ObjectId.isValid(id));
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid User ID' });
    }

    if (user.roleStatus != ROLE_STATUS.PENDING) {
        return res.status(400).json({ error: `User is already ${user.roleStatus}` })
    }
    user.roleStatus = approve ? ROLE_STATUS.APPROVED : ROLE_STATUS.REJECTED;
    user.deletedAt = approve ? null : new Date();
    await user.save();

    // --- UserActivity Log: For anomaly detection ---
    try {
        await UserActivity.create({
            user: req.user.id,
            type: approve ? 'user_approved' : 'user_rejected',
            success: true,
            ip: req.ip,
            details: {
                targetUserId: id,
                targetUserEmail: user.email,
                action: approve ? 'approved' : 'rejected'
            }
        });
    } catch (activityErr) {
        console.error('UserActivity error (approveUser):', activityErr);
    }

    if (approve) {
        await sendMail({
            to: user.email,
            subject: 'Your account has been approved',
            html: approvalTemplate({ userName: user.userName, frontendURL })
        })
    } else {
        await sendMail({
            to: user.email,
            subject: 'Your account registration was rejected',
            html: rejectionTemplate({ userName: user.userName })
        })
    }
    await adminAudit.create({
        adminID: req.user.id,
        targetUserId: user._id,
        action: approve ? ROLE_STATUS.APPROVED : ROLE_STATUS.REJECTED
    })
    res.status(200).json({ message: `User ${approve ? ROLE_STATUS.APPROVED : ROLE_STATUS.REJECTED}` });
};

// Reject a pending user registration
const rejectUser = async (req, res) => {
    req.body.approve = false;
    return approveUser(req, res);
};

// Permanently delete all rejected users
const deleteRejectedUsers = async (req, res) => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await User.deleteMany({
        roleStatus: ROLE_STATUS.REJECTED,
        deletedAt: { $lte: cutoff }
    });
    res.status(200).json({ message: `Deleted ${result.deletedCount} rejected user(s).` });
};

// Update a translator’s languages
const modifyLanguages = async (req, res) => {
    const { id } = req.params;
    const { languages } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'Invalid User ID' });
    }
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'No such user' });
        }
        if (user.role !== 'Translator') {
            return res.status(403).json({ error: 'Only Translators have languages assigned' });
        }

        //validating translator's languages
        if (!Array.isArray(languages) || languages.length == 0) {
            return res.status(400).json({ error: 'Select at least one language.' });
        }
        const uniqueCodes = [...new Set(languages.map(l => l.trim().toUpperCase()))];
        const allowed = await getAllowedLanguageCodes();
        const invalid = uniqueCodes.filter(c => !allowed.includes(c));
        if (invalid.length) {
            return res.status(400).json({ error: `Invalid language codes: ${invalid.join(', ')}.` });
        }
        user.languages = uniqueCodes;
        await user.save();
        await adminAudit.create({
            adminID: req.user.id,
            targetUserId: user._id,
            action: 'ModifiedLanguages',
            details: { languages: uniqueCodes }
        });
        // Send notification to the translator for each assigned language
        let notificationStatus = 'success';
        try {
            for (const lang of uniqueCodes) {
                await notifyLanguageAssignment(user, lang);
            }
            console.log(`Language assignment notifications sent to: ${user.email}`);
        } catch (notificationError) {
            console.error('Language assignment notification error:', notificationError.message);
            console.error('Full error stack:', notificationError.stack);
            notificationStatus = 'email_failed';
        }
        const response = { message: 'Languages Updated', notificationStatus };
        
        if (notificationStatus === 'email_failed') {
            response.warning = 'Languages updated successfully, but email notifications could not be sent.';
        }
        
        res.status(200).json(response);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete a single user by ID
const deleteUser = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid User ID' });
    }
    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ error: 'No such user' });
    }
    user.deletedAt = new Date();
    user.roleStatus = ROLE_STATUS.REJECTED;
    await user.save();
    await adminAudit.create({
        adminID: req.user.id,
        targetUserId: user._id,
        action: 'DeletedUser'
    });
    res.status(200).json({ message: 'User Deleted' });
};

// List all non-deleted users
const getUserList = async (req, res) => {
    try {
        const userList = await User.find({ deletedAt: null }).select({ userName: 1, role: 1 });
        res.status(200).json(userList);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Filter users by role (non-deleted)
const filterUserList = async (req, res) => {
    const { role } = req.params
    try {
        const users = await User.find({ role, deletedAt: null }).select('userName');
        res.status(200).json(users);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getPendingUsers = async (req, res) => {
    const users = await User.find({ roleStatus: 'Pending', deletedAt: null }).select('userName email role createdAt');
    res.json(users);
}

const getUser = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid User ID' });
    }

    try {
        const user = await User.findById(id)
            .select('_id userName email role languages isActive')
            .lean();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    approveUser,
    deleteRejectedUsers,
    modifyLanguages,
    deleteUser,
    getUserList,
    filterUserList,
    getPendingUsers,
    rejectUser,
    getUser
};
