// Admin level user management: approval, language updates, deletion, listing

const User = require('../models/User');
const mongoose = require('mongoose');

//Role status constants
const ROLE_STATUS = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
};

// Approve or reject a user
const approveUser = async (req, res) => {
    const { id, approve } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid User ID' });
    };

    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    if (approve) {
        user.roleStatus = ROLE_STATUS.APPROVED;
        user.deletedAt = null;
    } else {
        user.roleStatus = ROLE_STATUS.REJECTED;
        user.deletedAt = new Date();
    }
    await user.save();
    res.status(200).json({ message: `User ${approve ? 'approved' : 'rejected'}` });
};

// List all rejected users within 30-day window
const getRejectedUsers = async (req, res) => {
    const users = await User.find({
        roleStatus: 'Rejected',
        deletedAt: { $ne: null }
    }, 'userName email role deletedAt');
    res.status(200).json(users);
};

// Restore a previously rejected user
const restoreRejectedUser = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid User ID' });
    };
    const user = await User.findById(id);
    if (!user || user.roleStatus !== 'Rejected') {
        return res.status(404).json({ error: 'No such rejected user' });
    }
    user.roleStatus = ROLE_STATUS.PENDING;
    user.deletedAt = null;
    await user.save();
    res.status(200).json({ message: 'User restored to Pending Approval' });
};

// Permanently delete all rejected users
const deleteRejectedUsers = async (req, res) => {
    const result = await User.deleteMany({
        roleStatus: 'Rejected',
        deletedAt: { $ne: null }
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

        user.languages = languages;
        await user.save();
        res.status(200).json({ message: 'Languages Updated' });
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
    const user = await User.findByIdAndDelete(id);
    if (!user) {
        return res.status(404).json({ error: 'No such user' });
    }
    res.status(200).json({ message: 'User Deleted' });
};

// List all non-deleted users
const getUserList = async (req, res) => {
    try {
        const userList = await User.find({ deletedAt: null }, "userName role");
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

module.exports = {
    approveUser,
    getRejectedUsers,
    restoreRejectedUser,
    deleteRejectedUsers,
    modifyLanguages,
    deleteUser,
    getUserList,
    filterUserList
};