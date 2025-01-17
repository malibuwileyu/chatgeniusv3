/**
 * @file channelService.js
 * @description Channel service that handles all channel-related operations in the
 * chat application. This service manages channel creation, updates, membership,
 * and deletion with integrated system message support.
 * 
 * Core Functionality:
 * - Channel CRUD operations
 * - Member management
 * - Public/private channel handling
 * - System message integration
 * 
 * Features:
 * - Channel creation and deletion
 * - Member join/leave operations
 * - Channel metadata management
 * - Public channel discovery
 * - Channel update validation
 * - Owner privileges management
 * - System message generation
 * 
 * Dependencies:
 * - @supabase/supabase-js
 * - ./messageService
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import { createClient } from '@supabase/supabase-js';
import messageService from './messageService';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

class ChannelService {
    async getPublicChannels() {
        const { data: channels, error } = await supabase
            .from('channels')
            .select(`
                *,
                creator:created_by(id, username),
                members_count:channel_members(count)
            `)
            .eq('is_private', false)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return channels.map(channel => ({
            ...channel,
            members_count: channel.members_count[0].count
        }));
    }

    async createChannel({ name, description, is_private = false, created_by }) {
        // Create the channel
        console.log("Server: [createChannel] Creating channel with data:", { name, description, is_private, created_by });
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

        if (channelError) throw channelError;

        // Create a system message announcing the channel creation
        const { error: messageError } = await messageService.createSystemMessage(
            channel.id,
            `${created_by} created '${name}' channel`
        );

        if (messageError) throw messageError;

        console.log("Server: [createChannel] Channel created successfully:", channel);
        // Add the creator as a member with 'owner' role
        const { error: memberError } = await supabase
            .from('channel_members')
            .insert({
                channel_id: channel.id,
                user_id: created_by,
                role: 'owner'
            });

        if (memberError) throw memberError;

        return channel;
    }

    async joinChannel(channelId, userId) {
        console.log("Server: [joinChannel] Joining channel:", channelId, "for user:", userId);
        // Check if channel exists and is public
        const { data: channel, error: channelError } = await supabase
            .from('channels')
            .select('*')
            .eq('id', channelId)
            .limit(1)
            .single();

        if (channelError || !channel) throw new Error('Channel not found');
        if (channel.is_private) throw new Error('Cannot join private channel');

        // Check if already a member
        const { data: existingMember } = await supabase
            .from('channel_members')
            .select('*')
            .eq('channel_id', channelId)
            .eq('user_id', userId)
            .limit(1)
            .single();

        if (existingMember) throw new Error('Already a member of this channel');

        // Add user as member
        const { error: joinError } = await supabase
            .from('channel_members')
            .insert({
                channel_id: channelId,
                user_id: userId,
                role: 'member'
            });

        if (joinError) throw joinError;
    }

    async leaveChannel(channelId, userId) {
        // Check if channel exists
        const { data: channel, error: channelError } = await supabase
            .from('channels')
            .select('*')
            .eq('id', channelId)
            .limit(1)
            .single();

        if (channelError || !channel) throw new Error('Channel not found');

        // Check if user is a member
        const { data: membership, error: membershipError } = await supabase
            .from('channel_members')
            .select('role')
            .eq('channel_id', channelId)
            .eq('user_id', userId)
            .limit(1)
            .single();

        if (membershipError || !membership) throw new Error('Not a member of this channel');
        if (membership.role === 'owner') throw new Error('Channel owner cannot leave the channel');

        // Remove user from channel
        const { error: leaveError } = await supabase
            .from('channel_members')
            .delete()
            .eq('channel_id', channelId)
            .eq('user_id', userId);

        if (leaveError) throw leaveError;
    }

    async getChannel(channelId) {
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

        if (error) throw error;
        return channel;
    }

    async updateChannel(channelId, userId, { name, description, is_private }) {
        // Check if user is the creator of the channel
        const { data: channel, error: channelError } = await supabase
            .from('channels')
            .select('created_by')
            .eq('id', channelId)
            .single();

        if (channelError || !channel) throw new Error('Channel not found');
        if (channel.created_by !== userId) throw new Error('Only the channel creator can update the channel');

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

        if (updateError) throw updateError;
        return updatedChannel;
    }

    async deleteChannel(channelId, userId) {
        // Check if user is channel owner
        const { data: membership, error: membershipError } = await supabase
            .from('channel_members')
            .select('role')
            .eq('channel_id', channelId)
            .eq('user_id', userId)
            .limit(1)
            .single();

        if (membershipError || membership.role !== 'owner') {
            throw new Error('Only channel owner can delete channel');
        }

        // Delete channel (this will cascade to channel_members and messages)
        const { error } = await supabase
            .from('channels')
            .delete()
            .eq('id', channelId);

        if (error) throw error;
    }

    /**
     * Check if a user is a member of a specific channel
     * @param {string} channelId - The channel ID to check
     * @param {string} userId - The user ID to check
     * @returns {Promise<boolean>} True if user is a member, false otherwise
     */
    async isChannelMember(channelId, userId) {
        try {
            const { data, error } = await supabase
                .from('channel_members')
                .select('user_id')
                .eq('channel_id', channelId)
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error checking channel membership:', error);
                throw error;
            }

            return !!data;
        } catch (error) {
            console.error('Channel member check failed:', error);
            throw error;
        }
    }
}

export default new ChannelService(); 