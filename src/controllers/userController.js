const User = require('../models/User')
const mongoose = require('mongoose')

//Admin approval
const approveUser = async (req, res) => { }

//Modify User
const modifyLanguages = async (req, res) => {
    const { id } = req.params
    const { languages } = req.body
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'Invalid User ID' })
    }
    try {
        const user = await User.findById(id)
        if (!user) {
            return res.status(404).json({ error: 'No such user' })
        }
        if (user.role !== "Translator") {
            return res.status(404).json({ error: 'Only Translators have languages assigned' })
        }

        user.languages = languages
        await user.save()
        res.status(200).json({ mssg: 'Languages Updated' })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

//Delete User
const deleteUser = async (req, res) => {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'Invalid User ID' })
    }
    const user = await User.findByIdAndDelete(id)
    if (!user) {
        return res.status(404).json({ error: 'No such user' })
    }
    res.status(200).json({ mssg: 'User Deleted' })
}

//getAllUserList
const getUserList = async (req, res) => {
    try {
        const userList = await User.find({}, "userName role")
        res.status(200).json(userList)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

//Filter User By Role
const filterUserList = async (req, res) => {
    const { role } = req.params
    try {
        const users = await User.find({ role }).select('userName')
        if (!users) {
            return res.status(404).json({ error: 'No such users' })
        }
        res.status(200).json(users)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

module.exports = {
    approveUser,
    modifyLanguages,
    deleteUser,
    getUserList,
    filterUserList
}