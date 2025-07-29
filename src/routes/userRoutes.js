const express = require('express');
const router = express.Router();
const {
    approveUser,
    modifyLanguages,
    filterUserList,
    deleteUser,
    getUserList,
    deleteRejectedUsers,
    getPendingUsers,
    rejectUser,
    getUser
} = require('../controllers/userController');

const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.use(requireAuth);
const adminRouter = express.Router();
router.use('/', requireRole('Admin'), adminRouter);


adminRouter.put('/modifyLanguages/:id', modifyLanguages);
adminRouter.put('/:id/approve', approveUser);
adminRouter.delete('/deleteUser/:id', deleteUser);
adminRouter.get('/getUserList', getUserList);
adminRouter.get('/filterUserList/:role', filterUserList);
adminRouter.delete('/deleteRejectedUsers', deleteRejectedUsers);
adminRouter.get('/getPendingUsers', getPendingUsers);
adminRouter.put('/:id/reject', rejectUser);


router.get('/getUser/:id', getUser);

module.exports = router;