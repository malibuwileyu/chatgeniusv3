/**
 * @file reactions.js
 * @description Message reactions routes handler that provides endpoints for adding
 * and removing emoji reactions to messages. This file implements reaction management
 * with support for multiple reactions per message and user.
 * 
 * Endpoints:
 * - POST /api/reactions/:messageId: Add/remove a reaction to a message
 * - GET /api/reactions/:messageId: Get all reactions for a message
 * - GET /api/reactions/user/:userId: Get user's reactions
 * 
 * Features:
 * - Toggle reactions (add/remove)
 * - Multiple reactions per message
 * - User-specific reaction tracking
 * - Reaction counts and statistics
 * - Error handling and validation
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

// Add or remove a reaction
router.post('/:messageId', authenticateJWT, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id;

        // Check if reaction exists
        const { data: existingReaction, error: checkError } = await supabase
            .from('message_reactions')
            .select('*')
            .eq('message_id', messageId)
            .eq('user_id', userId)
            .eq('emoji', emoji)
            .limit(1)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            console.error('Error checking reaction:', checkError);
            return res.status(500).json({ message: 'Error checking reaction' });
        }

        if (existingReaction) {
            // Remove reaction if it exists
            const { error: deleteError } = await supabase
                .from('message_reactions')
                .delete()
                .eq('message_id', messageId)
                .eq('user_id', userId)
                .eq('emoji', emoji);

            if (deleteError) {
                console.error('Error removing reaction:', deleteError);
                return res.status(500).json({ message: 'Error removing reaction' });
            }

            res.json({ message: 'Reaction removed' });
        } else {
            // Add new reaction
            const { error: insertError } = await supabase
                .from('message_reactions')
                .insert({
                    message_id: messageId,
                    user_id: userId,
                    emoji
                });

            if (insertError) {
                console.error('Error adding reaction:', insertError);
                return res.status(500).json({ message: 'Error adding reaction' });
            }

            res.json({ message: 'Reaction added' });
        }
    } catch (error) {
        console.error('Error in reaction toggle:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get reactions for a message
router.get('/:messageId', authenticateJWT, async (req, res) => {
    try {
        const { messageId } = req.params;

        const { data: reactions, error } = await supabase
            .from('message_reactions')
            .select(`
                emoji,
                user_id,
                created_at,
                user:user_id(username)
            `)
            .eq('message_id', messageId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching reactions:', error);
            return res.status(500).json({ message: 'Error fetching reactions' });
        }

        res.json(reactions);
    } catch (error) {
        console.error('Error in reactions retrieval:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;