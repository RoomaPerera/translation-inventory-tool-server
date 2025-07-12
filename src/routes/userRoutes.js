const express = require('express')
const router = express.Router()
const {
    approveUser,
    assignLanguages,
    modifyLanguages,
    deleteUser,
    getUserList,
    filterUserList,
    getPendingUsers
} = require('../controllers/userController')
// const requireAuth = require('../middleware/requireAuth')

// Approve a user
router.put('/approveUser/:id', approveUser)

// Assign languages to a translator
router.post('/:id/assign-languages', assignLanguages)

// Modify languages for a user
router.put('/modifyLanguages/:id', modifyLanguages)

// Delete a user
router.delete('/deleteUser/:id', deleteUser)

// Get the user list
router.get('/getUserList', getUserList)

// Filter users by role
router.get('/filterUserList/:role', filterUserList)

//Get pending user list
router.get('/pendingUsers', getPendingUsers)

module.exports = router
