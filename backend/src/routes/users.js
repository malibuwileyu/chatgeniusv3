/**
 * @file users.js
 * @description User management routes handler that provides endpoints for retrieving
 * and managing user information. This file implements user profile functionality
 * with secure access control.
 * 
 * Endpoints:
 * - GET /api/users/:userId: Get user profile by ID
 * 
 * Features:
 * - User profile retrieval
 * - Secure user data access
 * - Error handling and validation
 * - Detailed logging
 * 
 * Dependencies:
 * - express
 * - @supabase/supabase-js
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Get user by ID
router.get('/:userId', authenticateJWT, async (req, res) => {
    console.log('Fetching user:', req.params.userId);
    try {
        const { userId } = req.params;

        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, avatar_url')
            .eq('id', userId)
            .limit(1)
            .single();

        if (error) {
            console.error('Error fetching user:', error);
            return res.status(500).json({ message: 'Error fetching user' });
        }

        if (!user) {
            console.log('User not found:', userId);
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('Found user:', user);
        res.json(user);
    } catch (error) {
        console.error('Error in user retrieval:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router; 