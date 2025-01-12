const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
    createMessage,
    getMessages,
    getThreadMessages,
    updateMessage,
    deleteMessage
} = require('../controllers/messageController');

// Create message
router.post('/', [
    auth,
    body('channelId').notEmpty(),
    body('content').notEmpty(),
    body('type').optional().isIn(['text', 'file', 'ai', 'system']),
    body('threadId').optional()
], createMessage);

// Get channel messages
router.get('/channel/:channelId', auth, getMessages);

// Get thread messages
router.get('/thread/:threadId', auth, getThreadMessages);

// Update message
router.put('/:id', [
    auth,
    body('content').notEmpty()
], updateMessage);

// Delete message
router.delete('/:id', auth, deleteMessage);

module.exports = router; 