const express = require('express');
const router = express.Router();
const {
    approveUser,
    modifyLanguages,
    filterUserList,
    deleteUser,
    getUserList,
    getRejectedUsers,
    restoreRejectedUser,
    deleteRejectedUsers
} = require('../controllers/userController');

const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.use(requireAuth);
const adminRouter = express.Router();

router.put('/modifyLanguages/:id', modifyLanguages);

adminRouter.put('/approveUser', approveUser);
router.put('/modifyLanguages/:id', modifyLanguages)
router.delete('/deleteUser/:id', deleteUser)
router.get('/getUserList', getUserList)
router.get('/filterUserList/:role', filterUserList)
adminRouter.delete('/deleteUser/:id', deleteUser);
adminRouter.get('/getUserList', getUserList);
adminRouter.get('/filterUserList/:role', filterUserList);
adminRouter.get('/getRejectedUsers', getRejectedUsers);
adminRouter.put('/restoreRejectedUser/:id', restoreRejectedUser);
adminRouter.delete('/deleteRejectedUsers', deleteRejectedUsers);

router.use('/', requireRole('Admin'), adminRouter);

module.exports = router;