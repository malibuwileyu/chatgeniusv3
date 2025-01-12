const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { uploadFile, getFile } = require('../controllers/fileController');

// Upload file
router.post('/upload', auth, uploadFile);

// Get file
router.get('/:id', auth, getFile);

module.exports = router; 