const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
    getUsers,
    getUser,
    updateUser,
    updateStatus,
    deleteUser
} = require('../controllers/userController');

// Get all users
router.get('/', auth, getUsers);

// Get single user
router.get('/:id', auth, getUser);

// Update user
router.put('/:id', [
    auth,
    body('username').optional().isLength({ min: 3 }),
    body('fullName').optional().notEmpty()
], updateUser);

// Update user status
router.put('/:id/status', [
    auth,
    body('status').isIn(['online', 'away', 'offline'])
], updateStatus);

// Delete user
router.delete('/:id', auth, deleteUser);

module.exports = router; 