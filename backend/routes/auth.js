const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { register, login, getMe } = require('../controllers/authController');

// Register user
router.post('/register', [
    body('email').isEmail(),
    body('username').isLength({ min: 3 }),
    body('password').isLength({ min: 6 }),
    body('fullName').notEmpty()
], register);

// Login user
router.post('/login', [
    body('email').isEmail(),
    body('password').exists()
], login);

// Get current user
router.get('/me', auth, getMe);

module.exports = router; 