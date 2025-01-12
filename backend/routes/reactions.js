const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
    addReaction,
    removeReaction,
    getReactions
} = require('../controllers/reactionController');

// Add reaction to message
router.post('/', [
    auth,
    body('messageId').notEmpty(),
    body('type').isIn(['like', 'heart', 'laugh', 'wow', 'sad', 'angry'])
], addReaction);

// Remove reaction from message
router.delete('/:id', auth, removeReaction);

// Get reactions for message
router.get('/message/:messageId', auth, getReactions);

module.exports = router; 