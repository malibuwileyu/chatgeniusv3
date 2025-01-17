/**
 * @file messages.js
 * @description Message management routes handler that provides endpoints for creating,
 * reading, updating, and deleting messages in both channels and direct messages.
 * This file implements comprehensive message handling with support for threaded
 * conversations and real-time updates.
 * 
 * Endpoints:
 * - POST /api/messages: Create a new message
 * - GET /api/messages/channel/:channelId: Get channel messages
 * - GET /api/messages/dm/:dmId: Get direct messages
 * - PUT /api/messages/:id: Update a message
 * - DELETE /api/messages/:id: Delete a message
 * - GET /api/messages/thread/:parentId: Get thread messages
 * 
 * Features:
 * - Channel and DM message support
 * - Threaded conversations
 * - Message editing and deletion
 * - User authorization checks
 * - Real-time message delivery
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
import channelService from '../services/channelService.js';

const router = express.Router();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Create a new message
router.post('/', authenticateJWT, async (req, res) => {
    try {
        const { content, channel_id, dm_id, parent_id } = req.body;
        const sender_id = req.user.id;

        // Validate that either channel_id or dm_id is provided, but not both
        if ((!channel_id && !dm_id) || (channel_id && dm_id)) {
            return res.status(400).json({ message: 'Must provide either channel_id or dm_id' });
        }

        // If it's a DM, verify the user is a member
        if (dm_id) {
            const { data: membership, error: membershipError } = await supabase
                .from('direct_message_members')
                .select('dm_id')
                .eq('dm_id', dm_id)
                .eq('user_id', sender_id)
                .limit(1)
                .single();

            if (membershipError || !membership) {
                return res.status(403).json({ message: 'Not authorized to send messages in this DM' });
            }
        }

        // First get the sender information
        const { data: sender, error: senderError } = await supabase
            .from('users')
            .select('id, username, avatar_url')
            .eq('id', sender_id)
            .limit(1)
            .single();

        if (senderError) {
            console.error('Error fetching sender:', senderError);
            return res.status(500).json({ message: 'Error fetching sender information' });
        }

        // Create the message with sender information included
        const messageData = {
            content,
            sender_id,
            channel_id,
            dm_id,
            parent_id,
            sender: sender  // Include sender info in the insert
        };

        const { data: message, error: messageError } = await supabase
            .from('messages')
            .insert({
                content,
                sender_id,
                channel_id,
                dm_id,
                parent_id
            })
            .select(`
                *,
                sender:sender_id(id, username, avatar_url)
            `)
            .limit(1)
            .single();

        if (messageError) {
            console.error('Error saving message:', messageError);
            return res.status(500).json({ message: 'Error saving message' });
        }

        // Format the response to match the expected structure
        const formattedMessage = {
            ...message,
            sender: sender  // Ensure sender info is included
        };

        res.status(201).json(formattedMessage);
    } catch (error) {
        console.error('Error in message creation:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get messages for a channel
router.get('/channel/:channelId', authenticateJWT, async (req, res) => {
    try {
        const { channelId } = req.params;
        const { limit = 50 } = req.query;

        const { data: messages, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(id, username, avatar_url),
                file:file_id(id, name, type, size, url)
            `)
            .eq('channel_id', channelId)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error fetching messages:', error);
            return res.status(500).json({ message: 'Error fetching messages' });
        }

        res.json(messages);
    } catch (error) {
        console.error('Error in message retrieval:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Edit a message
router.put('/:messageId', authenticateJWT, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        // First check if the user is the message sender
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('id', messageId)
            .limit(1)
            .single();

        if (messageError) {
            console.error('Error fetching message:', messageError);
            return res.status(500).json({ message: 'Error fetching message' });
        }

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.sender_id !== userId) {
            return res.status(403).json({ message: 'Not authorized to edit this message' });
        }

        // Update the message
        const { data: updatedMessage, error: updateError } = await supabase
            .from('messages')
            .update({
                content,
                is_edited: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', messageId)
            .select(`
                *,
                sender:sender_id(id, username, avatar_url)
            `)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        if (updateError) {
            console.error('Error updating message:', updateError);
            return res.status(500).json({ message: 'Error updating message' });
        }

        res.json(updatedMessage);
    } catch (error) {
        console.error('Error in message update:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete a message
router.delete('/:messageId', authenticateJWT, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        // First check if the user is the message sender
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('id', messageId)
            .limit(1)
            .single();

        if (messageError) {
            console.error('Error fetching message:', messageError);
            return res.status(500).json({ message: 'Error fetching message' });
        }

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.sender_id !== userId) {
            return res.status(403).json({ message: 'Not authorized to delete this message' });
        }

        // Delete the message
        const { error: deleteError } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (deleteError) {
            console.error('Error deleting message:', deleteError);
            return res.status(500).json({ message: 'Error deleting message' });
        }

        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error in message deletion:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get thread replies
router.get('/thread/:parentId', authenticateJWT, async (req, res) => {
    try {
        const { parentId } = req.params;

        const { data: replies, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(id, username, avatar_url),
                file:file_id(id, name, type, size, url)
            `)
            .eq('parent_id', parentId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching thread replies:', error);
            return res.status(500).json({ message: 'Error fetching thread replies' });
        }

        res.json(replies);
    } catch (error) {
        console.error('Error in thread replies retrieval:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get thread reply count
router.get('/thread/:messageId/count', authenticateJWT, async (req, res) => {
    try {
        const { messageId } = req.params;

        const { count, error } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('parent_id', messageId);

        if (error) {
            console.error('Error counting thread replies:', error);
            return res.status(500).json({ message: 'Error counting thread replies' });
        }

        res.json({ count });
    } catch (error) {
        console.error('Error in thread count retrieval:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Toggle message pin status
router.put('/:messageId/pin', authenticateJWT, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        // First check if the message exists and get its channel_id or dm_id
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .select('id, channel_id, dm_id')
            .eq('id', messageId)
            .limit(1)
            .single();

        if (messageError) {
            console.error('Error fetching message:', messageError);
            return res.status(500).json({ message: 'Error fetching message' });
        }

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // If it's a DM message, verify the user is a member
        if (message.dm_id) {
            const { data: membership, error: membershipError } = await supabase
                .from('direct_message_members')
                .select('dm_id')
                .eq('dm_id', message.dm_id)
                .eq('user_id', userId)
                .limit(1)
                .single();

            if (membershipError || !membership) {
                return res.status(403).json({ message: 'Not authorized to pin messages in this DM' });
            }
        }

        // Check if the message is already pinned
        const { data: pinnedMessage, error: pinnedError } = await supabase
            .from('pinned_messages')
            .select('*')
            .eq('message_id', messageId)
            .limit(1)
            .single();

        if (pinnedError && pinnedError.code !== 'PGRST116') { // PGRST116 is "not found" error
            console.error('Error checking pinned status:', pinnedError);
            return res.status(500).json({ message: 'Error checking pinned status' });
        }

        let result;
        if (pinnedMessage) {
            // Message is pinned, so unpin it
            const { error: deleteError } = await supabase
                .from('pinned_messages')
                .delete()
                .eq('message_id', messageId);

            if (deleteError) {
                console.error('Error unpinning message:', deleteError);
                return res.status(500).json({ message: 'Error unpinning message' });
            }
            result = { ...message, pinned: false };
        } else {
            // Message is not pinned, so pin it
            const { data: newPinnedMessage, error: insertError } = await supabase
                .from('pinned_messages')
                .insert({
                    message_id: messageId,
                    channel_id: message.channel_id,
                    dm_id: message.dm_id,
                    pinned_by: userId
                })
                .select()
                .limit(1)
                .single();

            if (insertError) {
                console.error('Error pinning message:', insertError);
                return res.status(500).json({ message: 'Error pinning message' });
            }
            result = { ...message, pinned: true };
        }

        // Get the full message data with sender info to return
        const { data: fullMessage, error: fullMessageError } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(id, username, avatar_url),
                file:file_id(id, name, type, size, url)
            `)
            .eq('id', messageId)
            .limit(1)
            .single();

        if (fullMessageError) {
            console.error('Error fetching full message:', fullMessageError);
            return res.status(500).json({ message: 'Error fetching full message data' });
        }

        res.json({ ...fullMessage, pinned: !pinnedMessage });
    } catch (error) {
        console.error('Error in message pin toggle:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get messages for a DM
router.get('/dm/:dmId', authenticateJWT, async (req, res) => {
    try {
        const { dmId } = req.params;
        const userId = req.user.id;

        // First verify the user is a member of this DM
        const { data: membership, error: membershipError } = await supabase
            .from('direct_message_members')
            .select('dm_id')
            .eq('dm_id', dmId)
            .eq('user_id', userId)
            .limit(1)
            .single();

        if (membershipError || !membership) {
            return res.status(403).json({ message: 'Not authorized to view this DM' });
        }

        const { data: messages, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(id, username, avatar_url),
                file:file_id(id, name, type, size, url)
            `)
            .eq('dm_id', dmId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching DM messages:', error);
            return res.status(500).json({ message: 'Error fetching messages' });
        }

        res.json(messages);
    } catch (error) {
        console.error('Error in DM message retrieval:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/:channelId/messages', authenticateJWT, async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user.id;

        // Check channel membership first if it's a channel message
        if (channelId) {
            const isMember = await channelService.isChannelMember(channelId, userId);
            if (!isMember) {
                return res.status(403).json({ 
                    success: false,
                    message: 'Not a member of this channel' 
                });
            }
        }

        // Rest of message fetching logic...
    } catch (error) {
        // Error handling...
    }
});

export default router;