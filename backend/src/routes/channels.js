/**
 * @file channels.js
 * @description Channel management routes handler that provides endpoints for creating,
 * reading, updating, and deleting chat channels. This file implements comprehensive
 * channel functionality including public/private channels, member management, and
 * channel metadata.
 * 
 * Endpoints:
 * - GET /api/channels/public: Retrieve all public channels
 * - POST /api/channels: Create a new channel
 * - GET /api/channels/:id: Get channel details
 * - PUT /api/channels/:id: Update channel
 * - DELETE /api/channels/:id: Delete channel
 * - POST /api/channels/:id/members: Add member to channel
 * - DELETE /api/channels/:id/members/:userId: Remove member from channel
 * 
 * Features:
 * - Public/private channel management
 * - Channel member management
 * - Channel metadata and statistics
 * - Authentication middleware integration
 * - Error handling and validation
 * 
 * Dependencies:
 * - express
 * - @supabase/supabase-js
 * - ../services/messageService.js
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';
import MessageService from '../services/messageService.js';

const router = express.Router();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Create a basic message service instance without Socket.IO for now
const messageService = new MessageService();

// Get all public channels
router.get('/public', authenticateJWT, async (req, res) => {
    try {
        const { data: channels, error } = await supabase
            .from('channels')
            .select(`
                *,
                creator:created_by(id, username),
                members_count:channel_members(count)
            `)
            .eq('is_private', false)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching public channels:', error);
            return res.status(500).json({ message: 'Error fetching channels' });
        }

        // Format the response to include the count
        const formattedChannels = channels.map(channel => ({
            ...channel,
            members_count: channel.members_count[0].count
        }));

        res.json(formattedChannels);
    } catch (error) {
        console.error('Error in public channel retrieval:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create a new channel
router.post('/', authenticateJWT, async (req, res) => {
    console.log("Server: [POST /api/channels] Request received");
    console.log("Server: [POST /api/channels] Headers:", req.headers);
    console.log("Server: [POST /api/channels] Body:", req.body);
    console.log("Server: [POST /api/channels] User:", req.user);

    try {
        const { name, description, is_private = false } = req.body;
        const created_by = req.user.id;

        if (!name) {
            console.error("Server: [POST /api/channels] Name is required");
            return res.status(400).json({ message: 'Channel name is required' });
        }

        // First create the channel
        const { data: channel, error: channelError } = await supabase
            .from('channels')
            .insert({
                name,
                description,
                is_private,
                created_by
            })
            .select()
            .limit(1)
            .single();

        if (channelError) {
            console.error('Server: [POST /api/channels] Error creating channel:', channelError);
            return res.status(500).json({
                message: 'Error creating channel',
                error: channelError
            });
        }

        console.log("Server: [POST /api/channels] Channel created successfully:", channel);

        // Add the creator as a member with 'owner' role first
        const { error: memberError } = await supabase
            .from('channel_members')
            .insert({
                channel_id: channel.id,
                user_id: created_by,
                role: 'owner'
            });

        if (memberError) {
            console.error('Server: [POST /api/channels] Error adding channel member:', memberError);
            return res.status(500).json({
                message: 'Error adding channel member',
                error: memberError
            });
        }

        // Then create the system message
        try {
            await messageService.saveMessage({
                content: `${req.user.username || created_by} created '${name}' channel`,
                channel_id: channel.id,
                type: 'system',
                sender_id: null
            });
        } catch (messageError) {
            // Log the error but don't fail the channel creation
            console.error('Server: [POST /api/channels] Error creating system message:', messageError);
        }

        res.status(201).json(channel);
    } catch (error) {
        console.error('Server: [POST /api/channels] Unexpected error:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Get all channels for the current user
router.get('/', authenticateJWT, async (req, res) => {
    try {
        // Get channels where user is a member
        const { data: channels, error } = await supabase
            .from('channels')
            .select(`
                *,
                channel_members!inner(user_id),
                creator:created_by(id, username)
            `)
            .eq('channel_members.user_id', req.user.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching channels:', error);
            return res.status(500).json({ message: 'Error fetching channels' });
        }

        res.json(channels);
    } catch (error) {
        console.error('Error in channel retrieval:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Join a channel
router.post('/:channelId/join', authenticateJWT, async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user.id;

        // Check if channel exists and is public
        const { data: channel, error: channelError } = await supabase
            .from('channels')
            .select('*')
            .eq('id', channelId)
            .limit(1)
            .single();

        if (channelError || !channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        if (channel.is_private) {
            return res.status(403).json({ message: 'Cannot join private channel' });
        }

        // Check if already a member
        const { data: existingMember, error: memberError } = await supabase
            .from('channel_members')
            .select('*')
            .eq('channel_id', channelId)
            .eq('user_id', userId)
            .limit(1)
            .single();

        if (existingMember) {
            return res.status(400).json({ message: 'Already a member of this channel' });
        }

        // Add user as member
        const { error: joinError } = await supabase
            .from('channel_members')
            .insert({
                channel_id: channelId,
                user_id: userId,
                role: 'member'
            });

        if (joinError) {
            console.error('Error joining channel:', joinError);
            return res.status(500).json({ message: 'Error joining channel' });
        }

        // Create system message for user joining
        try {
            await messageService.saveMessage({
                content: `${req.user.username || userId} joined the channel`,
                channel_id: channelId,
                type: 'system',
                sender_id: null
            });
        } catch (messageError) {
            // Log the error but don't fail the join operation
            console.error('Error creating system message for join:', messageError);
        }

        res.status(200).json({ message: 'Successfully joined channel' });
    } catch (error) {
        console.error('Error in channel join:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Leave a channel
router.post('/:channelId/leave', authenticateJWT, async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user.id;

        // Check if channel exists
        const { data: channel, error: channelError } = await supabase
            .from('channels')
            .select('*')
            .eq('id', channelId)
            .limit(1)
            .single();

        if (channelError || !channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        // Check if user is a member
        const { data: membership, error: membershipError } = await supabase
            .from('channel_members')
            .select('role')
            .eq('channel_id', channelId)
            .eq('user_id', userId)
            .maybe.limit(1).single();;

        if (membershipError) {
            console.error('Error checking membership:', membershipError);
            return res.status(500).json({ message: 'Error checking channel membership' });
        }

        if (!membership) {
            return res.status(400).json({ message: 'Not a member of this channel' });
        }

        // Don't allow channel owner to leave
        if (membership.role === 'owner') {
            return res.status(400).json({ message: 'Channel owner cannot leave the channel' });
        }

        // Remove user from channel
        const { error: leaveError } = await supabase
            .from('channel_members')
            .delete()
            .eq('channel_id', channelId)
            .eq('user_id', userId);

        if (leaveError) {
            console.error('Error leaving channel:', leaveError);
            return res.status(500).json({ message: 'Error leaving channel' });
        }

        res.status(200).json({ message: 'Successfully left channel' });
    } catch (error) {
        console.error('Error in channel leave:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get a specific channel
router.get('/:channelId', authenticateJWT, async (req, res) => {
    try {
        const { channelId } = req.params;

        // Get channel details with members
        const { data: channel, error } = await supabase
            .from('channels')
            .select(`
                *,
                members:channel_members(
                    user:user_id(id, username, avatar_url),
                    role
                ),
                creator:created_by(id, username)
            `)
            .eq('id', channelId)
            .limit(1)
            .single();

        if (error) {
            console.error('Error fetching channel:', error);
            return res.status(500).json({ message: 'Error fetching channel' });
        }

        // Check if user is a member
        const isMember = channel.members.some(member => member.user.id === req.user.id);
        if (!isMember) {
            return res.status(403).json({ message: 'Not a member of this channel' });
        }

        res.json(channel);
    } catch (error) {
        console.error('Error in channel retrieval:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update a channel
router.put('/:channelId', authenticateJWT, async (req, res) => {
    try {
        const { channelId } = req.params;
        const { name, description, is_private } = req.body;
        const userId = req.user.id;

        // Check if user is the creator of the channel
        const { data: channel, error: channelError } = await supabase
            .from('channels')
            .select('created_by')
            .eq('id', channelId)
            .single();

        if (channelError) {
            console.error('Error fetching channel:', channelError);
            return res.status(500).json({ message: 'Error fetching channel' });
        }

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        if (channel.created_by !== userId) {
            return res.status(403).json({ message: 'Only the channel creator can update the channel' });
        }

        // Update the channel
        const { data: updatedChannel, error: updateError } = await supabase
            .from('channels')
            .update({
                name,
                description,
                is_private,
                updated_at: new Date().toISOString()
            })
            .eq('id', channelId)
            .select(`
                *,
                creator:created_by(
                    id,
                    username
                )
            `)
            .order('created_at', { ascending: true })
            .single();

        if (updateError) {
            console.error('Error updating channel:', updateError);
            return res.status(500).json({ message: 'Error updating channel' });
        }

        res.json(updatedChannel);
    } catch (error) {
        console.error('Error in channel update:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete a channel
router.delete('/:channelId', authenticateJWT, async (req, res) => {
    try {
        const { channelId } = req.params;

        // Check if user is channel owner
        const { data: membership, error: membershipError } = await supabase
            .from('channel_members')
            .select('role')
            .eq('channel_id', channelId)
            .eq('user_id', req.user.id)
            .limit(1)
            .single();

        if (membershipError || membership.role !== 'owner') {
            return res.status(403).json({ message: 'Only channel owner can delete channel' });
        }

        // Delete channel (this will cascade to channel_members and messages)
        const { error } = await supabase
            .from('channels')
            .delete()
            .eq('id', channelId);

        if (error) {
            console.error('Error deleting channel:', error);
            return res.status(500).json({ message: 'Error deleting channel' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error in channel deletion:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
