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

router.use(requireRole('Admin'));
router.use(requireAuth);
const adminRouter = express.Router();


//adminRouter.put('/approveUser', approveUser);
//adminRouter.put('/modifyLanguages/:id', modifyLanguages);
//adminRouter.delete('/deleteUser/:id', deleteUser);
//adminRouter.get('/getUserList', getUserList);
//adminRouter.get('/filterUserList/:role', filterUserList);
adminRouter.delete('/deleteRejectedUsers', deleteRejectedUsers);
//adminRouter.get('/getPendingUsers', getPendingUsers);
//adminRouter.post('/assign-languages/:id', modifyLanguages);

router.use('/', requireRole('Admin'), adminRouter);

// GET /api/users/ -> Get all users (with optional filters in controller if needed)
router.get('/', getUserList);

// GET /api/users/pending -> Get users pending approval
router.get('/pending', getPendingUsers);

// PATCH /api/users/:id/approve -> Approve or reject a user
router.patch('/:id/approve', approveUser);

// PATCH /api/users/:id/languages -> Modify a translator's languages
router.patch('/:id/languages', modifyLanguages);

// DELETE /api/users/:id -> "Soft" delete a user
router.delete('/:id', deleteUser);

module.exports = router;
