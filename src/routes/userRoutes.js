const express = require('express');
const router = express.Router();
const {
    approveUser,
    modifyLanguages,
    filterUserList,
    deleteUser,
    getUserList,
    deleteRejectedUsers,
    getPendingUsers
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
adminRouter.delete('/deleteRejectedUsers', deleteRejectedUsers);
adminRouter.get('/getPendingUsers', getPendingUsers);
adminRouter.post('/assign-languages/:id', modifyLanguages);

router.use('/', requireRole('Admin'), adminRouter);

module.exports = router;
