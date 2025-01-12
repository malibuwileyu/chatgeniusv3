const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
    createChannel,
    getChannels,
    getChannel,
    updateChannel,
    addMember,
    removeMember,
    getMembers
} = require('../controllers/channelController');

// Create channel
router.post('/', [
    auth,
    body('name').notEmpty(),
    body('type').isIn(['public', 'private', 'dm'])
], createChannel);

// Get all channels for user
router.get('/', auth, getChannels);

// Get single channel
router.get('/:id', auth, getChannel);

// Update channel
router.put('/:id', [
    auth,
    body('name').optional().notEmpty(),
    body('description').optional()
], updateChannel);

// Add member to channel
router.post('/:id/members', [
    auth,
    body('userId').notEmpty(),
    body('role').optional().isIn(['admin', 'member'])
], addMember);

// Remove member from channel
router.delete('/:id/members/:userId', auth, removeMember);

// Get channel members
router.get('/:id/members', auth, getMembers);

module.exports = router; 