const express = require('express')
const router = express.Router()
const {
    approveUser,
    modifyLanguages, filterUserList,
    deleteUser, getUserList
} = require('../controllers/userController')
const requireAuth = require('../middleware/requireAuth')
//require auth for all the below functions
//router.use(requireAuth)

router.put('/approveUser', approveUser)
router.put('/modifyLanguages/:id', modifyLanguages)
router.delete('/deleteUser/:id', deleteUser)
router.get('/getUserList', getUserList)
router.get('/filterUserList/:role', filterUserList)

module.exports = router