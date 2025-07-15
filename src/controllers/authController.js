const User = require('../models/User')
const jwt = require('jsonwebtoken')

const createToken = (id) => {
    return jwt.sign({ id }, process.env.SECRET, { expiresIn: '2h' })
}

//register
const registerUser = async (req, res) => {
    const { userName, email, password, role, languages } = req.body
    try {
        const user = await User.register(userName, email, password, role, languages)
        res.status(200).json({ mssg: 'Send to Approval' })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

//login
const loginUser = async (req, res) => {
    const { email, password } = req.body
    try {
        const user = await User.login(email, password)
        const token = createToken(user.id)
        res.status(200).json({ email, token })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

//password reset
const resetPassword = async (req, res) => { }

module.exports = {
    registerUser,
    loginUser,
    resetPassword
}