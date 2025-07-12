const express = require('express')
const router = express.Router()
const {
    registerUser,
    loginUser,
    resetPassword, 
    approveOrRejectUser
} = require('../controllers/authController')

router.post('/register', registerUser)
router.post('/login', loginUser)
router.post('/resetPassword', resetPassword)
router.patch('/approve/:id', approveOrRejectUser) // admin only: approve or reject a user

module.exports = router