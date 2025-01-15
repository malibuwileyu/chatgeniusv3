/**
 * @file realtimeService.js
 * @description Real-time communication service that manages live updates and
 * subscriptions using Supabase's real-time capabilities. This service handles
 * message updates, typing indicators, and thread notifications.
 * 
 * Core Functionality:
 * - Channel subscriptions
 * - Thread subscriptions
 * - Typing indicators
 * - Message event handling
 * - Real-time updates
 * 
 * Features:
 * - Live message updates
 * - Thread notifications
 * - Typing status management
 * - Channel presence
 * - Event filtering
 * - Subscription cleanup
 * - Error handling
 * 
 * Subscriptions:
 * - Channel messages
 * - Thread messages
 * - User typing status
 * - Message deletions
 * - Message reactions
 * 
 * Dependencies:
 * - ../supabaseClient
 * - ./reactionService
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import { supabase } from '../supabaseClient';
import reactionService from './reactionService';

class RealtimeService {
    constructor() {
        this.channels = new Map();
    }

    subscribeToChannel(channelId, onMessage) {
        // If already subscribed to this channel, return existing subscription
        if (this.channels.has(channelId)) {
            return this.channels.get(channelId);
        }

        // Create a new subscription
        const channel = supabase
            .channel(`messages:${channelId}`)
            .on('postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    console.log('Delete event received:', payload);
                    onMessage({
                        type: 'message_deleted',
                        messageId: payload.old.id
                    });
                }
            )
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `channel_id=eq.${channelId}`
                },
                async (payload) => {
                    console.log('Channel message event:', payload.eventType, payload);
                    // Get sender information if not included
                    let messageWithSender = payload.new;
                    if (!messageWithSender.sender) {
                        try {
                            const { data: sender } = await supabase
                                .from('users')
                                .select('id, username, avatar_url')
                                .eq('id', messageWithSender.sender_id)
                                .limit(1)
                                .single();
                            messageWithSender = { ...messageWithSender, sender };

                            // If message has a file_id, fetch the file data
                            if (messageWithSender.file_id) {
                                const { data: file } = await supabase
                                    .from('files')
                                    .select('id, name, type, size, url')
                                    .eq('id', messageWithSender.file_id)
                                    .limit(1)
                                    .single();
                                messageWithSender = { ...messageWithSender, file };
                            }
                        } catch (error) {
                            console.error('Error fetching sender or file:', error);
                        }
                    }
                    switch (payload.eventType) {
                        case 'INSERT':
                            onMessage({
                                type: 'new_message',
                                message: messageWithSender
                            });
                            break;
                        case 'UPDATE':
                            onMessage({
                                type: 'message_updated',
                                message: messageWithSender
                            });
                            break;
                    }
                }
            )
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `dm_id=eq.${channelId}`
                },
                async (payload) => {
                    console.log('DM message event:', payload.eventType, payload);
                    // Get sender information if not included
                    let messageWithSender = payload.new;
                    if (!messageWithSender.sender) {
                        try {
                            const { data: sender } = await supabase
                                .from('users')
                                .select('id, username, avatar_url')
                                .eq('id', messageWithSender.sender_id)
                                .limit(1)
                                .single();
                            messageWithSender = { ...messageWithSender, sender };

                            // If message has a file_id, fetch the file data
                            if (messageWithSender.file_id) {
                                const { data: file } = await supabase
                                    .from('files')
                                    .select('id, name, type, size, url')
                                    .eq('id', messageWithSender.file_id)
                                    .limit(1)
                                    .single();
                                messageWithSender = { ...messageWithSender, file };
                            }
                        } catch (error) {
                            console.error('Error fetching sender or file:', error);
                        }
                    }
                    switch (payload.eventType) {
                        case 'INSERT':
                            onMessage({
                                type: 'new_message',
                                message: messageWithSender
                            });
                            break;
                        case 'UPDATE':
                            onMessage({
                                type: 'message_updated',
                                message: messageWithSender
                            });
                            break;
                    }
                }
            )
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'message_reactions'
                },
                async (payload) => {
                    try {
                        const messageId = payload.new?.message_id || payload.old?.message_id;
                        if (messageId) {
                            // Use the reactionService instead of direct fetch
                            const reactions = await reactionService.getMessageReactions(messageId);
                            onMessage({
                                type: 'reactions_updated',
                                messageId,
                                reactions
                            });
                        }
                    } catch (error) {
                        console.error('Error fetching updated reactions:', error);
                    }
                }
            );

        // Subscribe to the channel
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`Subscribed to channel: messages:${channelId}`);
            }
            if (status === 'CLOSED') {
                console.log(`Channel closed: messages:${channelId}`);
                this.channels.delete(channelId);
            }
            if (status === 'CHANNEL_ERROR') {
                console.error(`Channel error for messages:${channelId}`);
                this.channels.delete(channelId);
            }
        });

        // Store the subscription
        this.channels.set(channelId, channel);
        return channel;
    }

    subscribeToThread(parentId, onMessage) {
        const channel = supabase
            .channel(`thread:${parentId}`)
            .on('postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    console.log('Thread message delete event:', payload);
                    onMessage({
                        type: 'message_deleted',
                        messageId: payload.old.id
                    });
                }
            )
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `parent_id=eq.${parentId}`
                },
                async (payload) => {
                    console.log('Thread message insert event:', payload);
                    let messageWithSender = payload.new;
                    try {
                        const { data: sender } = await supabase
                            .from('users')
                            .select('id, username, avatar_url')
                            .eq('id', messageWithSender.sender_id)
                            .limit(1)
                            .single();
                        messageWithSender = { ...messageWithSender, sender };

                        // If message has a file_id, fetch the file data
                        if (messageWithSender.file_id) {
                            const { data: file } = await supabase
                                .from('files')
                                .select('id, name, type, size, url')
                                .eq('id', messageWithSender.file_id)
                                .limit(1)
                                .single();
                            messageWithSender = { ...messageWithSender, file };
                        }
                        onMessage({
                            type: 'new_message',
                            message: messageWithSender
                        });
                    } catch (error) {
                        console.error('Error fetching sender or file:', error);
                    }
                }
            )
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `parent_id=eq.${parentId}`
                },
                async (payload) => {
                    console.log('Thread message update event:', payload);
                    let messageWithSender = payload.new;
                    try {
                        const { data: sender } = await supabase
                            .from('users')
                            .select('id, username, avatar_url')
                            .eq('id', messageWithSender.sender_id)
                            .limit(1)
                            .single();
                        messageWithSender = { ...messageWithSender, sender };

                        // If message has a file_id, fetch the file data
                        if (messageWithSender.file_id) {
                            const { data: file } = await supabase
                                .from('files')
                                .select('id, name, type, size, url')
                                .eq('id', messageWithSender.file_id)
                                .limit(1)
                                .single();
                            messageWithSender = { ...messageWithSender, file };
                        }
                        onMessage({
                            type: 'message_updated',
                            message: messageWithSender
                        });
                    } catch (error) {
                        console.error('Error fetching sender or file:', error);
                    }
                }
            )
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'message_reactions'
                },
                async (payload) => {
                    try {
                        const messageId = payload.new?.message_id || payload.old?.message_id;
                        if (messageId) {
                            const reactions = await reactionService.getMessageReactions(messageId);
                            onMessage({
                                type: 'reactions_updated',
                                messageId,
                                reactions
                            });
                        }
                    } catch (error) {
                        console.error('Error fetching updated reactions:', error);
                    }
                }
            )
            .subscribe((status) => {
                console.log(`Thread subscription status for ${parentId}:`, status);
            });

        return channel;
    }

    unsubscribeFromThread(parentId) {
        const channel = supabase.channel(`thread:${parentId}`);
        if (channel) {
            supabase.removeChannel(channel);
        }
    }

    unsubscribeFromChannel(channelId) {
        const channel = this.channels.get(channelId);
        if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(channelId);
        }
    }

    // Subscribe to typing indicators
    subscribeToTyping(channelId, onTypingUpdate) {
        const channel = supabase
            .channel(`typing:${channelId}`)
            .on('presence', { event: 'sync' }, () => {
                const typingUsers = this.getTypingUsers(channel);
                onTypingUpdate(typingUsers);
            })
            .on('presence', { event: 'join' }, () => {
                const typingUsers = this.getTypingUsers(channel);
                onTypingUpdate(typingUsers);
            })
            .on('presence', { event: 'leave' }, () => {
                const typingUsers = this.getTypingUsers(channel);
                onTypingUpdate(typingUsers);
            })
            .subscribe();

        return channel;
    }

    // Start typing indicator
    async startTyping(channel, user) {
        await channel.track({
            user_id: user.id,
            username: user.username,
            isTyping: true
        });
    }

    // Stop typing indicator
    async stopTyping(channel) {
        await channel.untrack();
    }

    // Get list of users currently typing
    getTypingUsers(channel) {
        const presenceState = channel.presenceState();
        return Object.values(presenceState).flat().filter(user => user.isTyping);
    }
}

export default new RealtimeService(); 