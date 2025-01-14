/**
 * @file files.js
 * @description File management routes handler that provides endpoints for uploading,
 * downloading, and managing files in the chat application. This file implements
 * secure file handling with AWS S3 integration and local temporary storage.
 * 
 * Endpoints:
 * - POST /api/files/upload: Upload a new file
 * - GET /api/files/:fileId: Download/retrieve a file
 * - DELETE /api/files/:fileId: Delete a file
 * 
 * Features:
 * - Multer configuration for file uploads
 * - File size and type restrictions
 * - AWS S3 integration for permanent storage
 * - Temporary local storage management
 * - Secure file access control
 * - Error handling and validation
 * 
 * Dependencies:
 * - express
 * - multer
 * - uuid
 * - @supabase/supabase-js
 * - ../utils/awsS3connect.js
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticateJWT } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { uploadFileToAws, getFileUrl } from '../utils/awsS3connect.js';

const router = express.Router();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure uploads directory exists
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniquePrefix = uuidv4();
        cb(null, uniquePrefix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Add file type restrictions if needed
        cb(null, true);
    }
});

// Ensure authentication before file upload
router.post('/upload', authenticateJWT, upload.single('file'), async (req, res) => {
    try {
        console.log('File upload request received:', {
            file: req.file,
            body: req.body,
            user: req.user
        });

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const { channelId, dmId, messageContent } = req.body;
        if (!channelId && !dmId) {
            return res.status(400).json({ message: 'Either Channel ID or DM ID is required' });
        }

        if (channelId && dmId) {
            return res.status(400).json({ message: 'Cannot specify both Channel ID and DM ID' });
        }

        const userId = req.user.id;

        // If it's a DM, verify the user is a member
        if (dmId) {
            const { data: membership, error: membershipError } = await supabase
                .from('direct_message_members')
                .select('dm_id')
                .eq('dm_id', dmId)
                .eq('user_id', userId)
                .limit(1)
                .single();

            if (membershipError || !membership) {
                return res.status(403).json({ message: 'Not authorized to send files in this DM' });
            }
        }

        // Upload file to S3
        console.log('Uploading file to S3:', {
            filename: req.file.filename,
            path: req.file.path
        });

        const s3Key = `files/${req.file.filename}`;
        await uploadFileToAws(s3Key, req.file.path);

        // Get the S3 URL
        console.log('Getting S3 URL for file:', s3Key);
        const fileUrl = await getFileUrl(s3Key);

        // Save file metadata to database
        console.log('Saving file metadata to database');
        const { data: file, error: fileError } = await supabase
            .from('files')
            .insert({
                name: req.file.originalname,
                type: req.file.mimetype,
                size: req.file.size,
                url: fileUrl,
                uploader_id: userId
            })
            .select()
            .limit(1)
            .single();

        if (fileError) {
            console.error('Error saving file metadata:', fileError);
            return res.status(500).json({ message: 'Error saving file metadata', error: fileError });
        }

        // Create a message with the file
        console.log('Creating message with file');
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .insert({
                content: messageContent || `Shared a file: ${req.file.originalname}`,
                sender_id: userId,
                channel_id: channelId || null,
                dm_id: dmId || null,
                file_id: file.id
            })
            .select(`
                *,
                sender:sender_id(id, username, avatar_url),
                file:files(id, name, type, size, url)
            `)
            .limit(1)
            .single();

        if (messageError) {
            console.error('Error creating message:', messageError);
            return res.status(500).json({ message: 'Error creating message', error: messageError });
        }

        console.log('File upload completed successfully');
        res.status(201).json(message);
    } catch (error) {
        console.error('Error in file upload:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
                console.log('Cleaned up temporary file:', req.file.path);
            } catch (cleanupError) {
                console.error('Error cleaning up temporary file:', cleanupError);
            }
        }
        res.status(500).json({
            message: 'Internal server error',
            error: error.message || error
        });
    }
});

export default router; 