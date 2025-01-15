/**
 * @file Chat.jsx
 * @description Main chat interface component that manages the entire chat application's
 * UI and functionality. This component handles messages, channels, direct messages,
 * threads, and real-time updates.
 * 
 * Core Functionality:
 * - Message display and management
 * - Channel and DM handling
 * - Real-time updates
 * - Thread management
 * - File uploads
 * - User interactions
 * 
 * Features:
 * - Real-time messaging
 * - Channel management
 * - Direct messaging
 * - Message threading
 * - Message reactions
 * - Message pinning
 * - File sharing
 * - User typing indicators
 * - Message formatting
 * - Channel/DM navigation
 * 
 * Props:
 * - onLogout: Function to handle user logout
 * 
 * Dependencies:
 * - react
 * - react-router-dom
 * - ../services/*
 * - ./components/*
 * - ../supabaseClient
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './Header';
import PropTypes from 'prop-types';
import messageService from '../../services/messageService';
import realtimeService from '../../services/realtimeService';
import reactionService from '../../services/reactionService';
import fileService from '../../services/fileService';
import { getUser } from '../../services/authService';
import ChannelList from '../channels/ChannelList';
import DirectMessageList from '../messages/DirectMessageList';
import MessageReactions from '../messages/MessageReactions';
import EditMessageForm from '../messages/EditMessageForm';
import FormattedMessage from '../messages/FormattedMessage';
import FormattingGuide from '../messages/FormattingGuide';
import ThreadView from '../threads/ThreadView';
import ChannelInfoBar from '../channels/ChannelInfoBar';
import { supabase } from '../../supabaseClient';
import UserList from './UserList';
import channelService from '../../services/channelService';

const systemMessageStyles = {
    container: 'flex items-center justify-center py-2',
    content: 'text-gray-500 text-sm flex items-center space-x-2',
    label: 'bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-medium'
};

function Chat({ onLogout }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [typingUsers, setTypingUsers] = useState([]);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [activeThread, setActiveThread] = useState(null);
    const [replyCounts, setReplyCounts] = useState({});
    const [currentChannel, setCurrentChannel] = useState(null);
    const [showPinnedMessages, setShowPinnedMessages] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const typingChannelRef = useRef(null);
    const currentUser = getUser();
    const [selectedDMId, setSelectedDMId] = useState(null);
    const [dmParticipants, setDMParticipants] = useState([]);
    const [channels, setChannels] = useState([]);
    const fileInputRef = useRef(null);
    const [rightSidebarView, setRightSidebarView] = useState('presence');
    const [channelMembers, setChannelMembers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [allUsers, setAllUsers] = useState([]);

    const currentChannelId = !selectedDMId ? searchParams.get('channel') : null;

    useEffect(() => {
        const loadChannels = async () => {
            try {
                const userChannels = await channelService.getChannels();
                setChannels(userChannels);

                if (!searchParams.get('channel') && userChannels.length > 0) {
                    setSearchParams({ channel: userChannels[0].id });
                }
            } catch (error) {
                console.error('Error loading channels:', error);
            }
        };

        loadChannels();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        // Only proceed if we have a valid channel ID or DM ID
        if (!selectedDMId && !currentChannelId) return;

        // Subscribe to realtime messages
        const channelOrDM = selectedDMId || currentChannelId;
        realtimeService.subscribeToChannel(channelOrDM, (event) => {
            console.log('Received realtime event:', event);
            let messageWithSender;
            switch (event.type) {
                case 'new_message':
                    // Get the sender information from the message
                    messageWithSender = {
                        ...event.message,
                        sender: event.message.sender,
                        reactions: []
                    };
                    setMessages(prev => [...prev, messageWithSender]);

                    // If this is a reply, update the reply count for the parent message
                    if (event.message.parent_id) {
                        setReplyCounts(prev => ({
                            ...prev,
                            [event.message.parent_id]: (prev[event.message.parent_id] || 0) + 1
                        }));
                    }
                    break;
                case 'message_updated':
                    messageWithSender = {
                        ...event.message,
                        sender: event.message.sender
                    };
                    setMessages(prev => prev.map(msg =>
                        msg.id === event.message.id ? { ...messageWithSender, reactions: msg.reactions } : msg
                    ));
                    break;
                case 'message_deleted':
                    console.log('Handling message deletion:', event.messageId);
                    setMessages(prev => {
                        console.log('Current messages:', prev);
                        const messageExists = prev.some(msg => msg.id === event.messageId);
                        const deletedMessage = prev.find(msg => msg.id === event.messageId);

                        // If the deleted message was a reply, update the reply count
                        if (deletedMessage?.parent_id) {
                            setReplyCounts(prev => ({
                                ...prev,
                                [deletedMessage.parent_id]: Math.max(0, (prev[deletedMessage.parent_id] || 0) - 1)
                            }));
                        }

                        return messageExists ? prev.filter(msg => msg.id !== event.messageId) : prev;
                    });
                    break;
                case 'reactions_updated':
                    setMessages(prev => prev.map(msg =>
                        msg.id === event.messageId ? { ...msg, reactions: event.reactions } : msg
                    ));
                    break;
            }
        });

        // Subscribe to typing indicators
        typingChannelRef.current = realtimeService.subscribeToTyping(channelOrDM, (users) => {
            setTypingUsers(users.filter(user => user.user_id !== currentUser.id));
        });

        // Load existing messages
        const loadMessages = async () => {
            try {
                let messages;
                if (selectedDMId) {
                    messages = await messageService.getDMMessages(selectedDMId);
                } else {
                    messages = await messageService.getChannelMessages(currentChannelId);
                }

                // Load pinned messages first to get the pinned status
                const { data: pinnedMessages, error: pinnedError } = await supabase
                    .from('pinned_messages')
                    .select('message_id')
                    .eq(selectedDMId ? 'dm_id' : 'channel_id', selectedDMId || currentChannelId);

                if (pinnedError) {
                    console.error('Error loading pinned messages:', pinnedError);
                }

                const pinnedMessageIds = new Set(pinnedMessages?.map(p => p.message_id) || []);

                // Load reactions for each message and set pinned status
                const messagesWithReactionsAndPins = await Promise.all(
                    messages.map(async (message) => {
                        const reactions = await reactionService.getMessageReactions(message.id);
                        return {
                            ...message,
                            reactions,
                            pinned: pinnedMessageIds.has(message.id)
                        };
                    })
                );
                setMessages(messagesWithReactionsAndPins);

                // Load reply counts for each message
                const counts = {};
                await Promise.all(
                    messages.filter(msg => !msg.parent_id).map(async (message) => {
                        try {
                            const count = await messageService.getThreadCount(message.id);
                            if (count > 0) {
                                counts[message.id] = count;
                            }
                        } catch (error) {
                            console.error('Error fetching reply count:', error);
                        }
                    })
                );
                setReplyCounts(counts);
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        };

        loadMessages();

        // Clean up
        return () => {
            realtimeService.unsubscribeFromChannel(channelOrDM);
            if (typingChannelRef.current) {
                realtimeService.stopTyping(typingChannelRef.current);
            }
        };
    }, [currentChannelId, selectedDMId, currentUser.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleTyping = () => {
        if (typingChannelRef.current) {
            realtimeService.startTyping(typingChannelRef.current, currentUser);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout
        typingTimeoutRef.current = setTimeout(() => {
            if (typingChannelRef.current) {
                realtimeService.stopTyping(typingChannelRef.current);
            }
        }, 1000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const message = {
                content: newMessage.trim(),
                channel_id: selectedDMId ? null : currentChannelId,
                dm_id: selectedDMId || null
            };

            // Send message through API
            await messageService.sendMessage(message);

            // Clear input
            setNewMessage('');

            // Clear typing indicator
            if (typingChannelRef.current) {
                realtimeService.stopTyping(typingChannelRef.current);
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleReaction = async (messageId, emoji) => {
        try {
            await reactionService.toggleReaction(messageId, emoji);
            const reactions = await reactionService.getMessageReactions(messageId);
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, reactions } : msg
            ));
        } catch (error) {
            console.error('Error toggling reaction:', error);
        }
    };

    const handleChannelSelect = (channelId) => {
        setSelectedDMId(null);  // Clear selected DM
        setSearchParams({ channel: channelId });
        setMessages([]); // Clear messages when switching
    };

    const handleEditMessage = async (messageId, newContent) => {
        try {
            await messageService.editMessage(messageId, newContent);
        } catch (error) {
            console.error('Error editing message:', error);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm('Are you sure you want to delete this message?')) {
            return;
        }

        try {
            await messageService.deleteMessage(messageId);
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const handlePinMessage = async (messageId) => {
        try {
            const updatedMessage = await messageService.togglePin(messageId);
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...updatedMessage, reactions: msg.reactions } : msg
            ));

            // Update pinned messages list
            if (updatedMessage.pinned) {
                setPinnedMessages(prev => [...prev, { ...updatedMessage }]);
            } else {
                setPinnedMessages(prev => prev.filter(msg => msg.id !== messageId));
            }
        } catch (error) {
            console.error('Error toggling message pin:', error);
        }
    };

    useEffect(() => {
        const loadChannel = async () => {
            if (!currentChannelId) return;

            try {
                const { data: channels, error } = await supabase
                    .from('channels')
                    .select(`
                        *,
                        creator:created_by(
                            id,
                            username
                        )
                    `)
                    .eq('id', currentChannelId)
                    .limit(1);

                if (error) {
                    console.error('Error loading channel:', error);
                    return;
                }

                if (channels && channels.length > 0) {
                    // Ensure created_by is set correctly
                    const channel = {
                        ...channels[0],
                        created_by: channels[0].creator.id
                    };
                    setCurrentChannel(channel);
                    // Load pinned messages when channel is loaded
                    loadPinnedMessages();
                } else {
                    console.log('No channel found with ID:', currentChannelId);
                    setCurrentChannel(null);
                }
            } catch (error) {
                console.error('Error in channel loading:', error);
                setCurrentChannel(null);
            }
        };

        loadChannel();
    }, [currentChannelId]);

    const loadPinnedMessages = async () => {
        try {
            const { data: pinned, error } = await supabase
                .from('pinned_messages')
                .select(`
                    *,
                    message:message_id(
                        *,
                        sender:sender_id(id, username, avatar_url),
                        file:file_id(id, name, type, size, url)
                    )
                `)
                .eq(selectedDMId ? 'dm_id' : 'channel_id', selectedDMId || currentChannelId);

            if (error) {
                console.error('Error loading pinned messages:', error);
                return;
            }

            // Transform the data to get the message with pinned status
            const pinnedMessagesData = pinned.map(p => ({
                ...p.message,
                pinned: true,
                pinned_at: p.pinned_at,
                pinned_by: p.pinned_by
            }));

            setPinnedMessages(pinnedMessagesData);
        } catch (error) {
            console.error('Error in pinned messages loading:', error);
        }
    };

    const handleViewPinnedMessages = (show) => {
        setShowPinnedMessages(show);
        if (show) {
            loadPinnedMessages();
        }
    };

    const handleLeaveChannel = async () => {
        try {
            await channelService.leaveChannel(currentChannelId);
            setCurrentChannel(null);
            setSearchParams({});
            setMessages([]);
            // Trigger a refresh of the channel list
            const updatedChannels = await channelService.getChannels();
            setChannels(updatedChannels);
        } catch (error) {
            console.error('Error leaving channel:', error);
        }
    };

    useEffect(() => {
        if (selectedDMId) {
            const loadDMParticipants = async () => {
                try {
                    const { data: members, error } = await supabase
                        .from('direct_message_members')
                        .select(`
                            user:user_id(
                                id,
                                username,
                                avatar_url
                            )
                        `)
                        .eq('dm_id', selectedDMId);

                    if (error) {
                        console.error('Error loading DM participants:', error);
                        return;
                    }

                    setDMParticipants(members.map(m => m.user));
                } catch (error) {
                    console.error('Error in DM participants loading:', error);
                }
            };

            loadDMParticipants();
        }
    }, [selectedDMId]);

    const handleDMSelect = (dmId) => {
        setSelectedDMId(dmId);
        setSearchParams({ dm: dmId });  // Update URL to reflect DM selection
        setMessages([]); // Clear messages when switching
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const channelList = await channelService.getChannels();
                setChannels(channelList);
            } catch (error) {
                console.error('Error loading channels:', error);
            }
        };

        loadInitialData();
    }, []);

    const handleChannelUpdate = (updatedChannel) => {
        setCurrentChannel(updatedChannel);
        // Update the channel in the channels list
        setChannels(prev => prev.map(ch =>
            ch.id === updatedChannel.id ? updatedChannel : ch
        ));
    };

    const handleChannelDelete = () => {
        // Clear current channel
        setCurrentChannel(null);
        setSearchParams({});
        setMessages([]);
        // Remove the channel from the channels list
        setChannels(prev => prev.filter(ch => ch.id !== currentChannel.id));
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            await fileService.uploadFile(file, {
                channelId: selectedDMId ? null : currentChannelId,
                dmId: selectedDMId
            });
            // The message will be added through the realtime subscription
            event.target.value = ''; // Reset file input
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    };

    useEffect(() => {
        // Get DM ID from URL if present
        const dmId = searchParams.get('dm');
        if (dmId) {
            handleDMSelect(dmId);
        }

        // Get user ID from URL if present (for starting new DM)
        const userId = searchParams.get('user');
        if (userId) {
            const startNewDM = async () => {
                try {
                    // Create a new DM
                    const { data: dm, error: dmError } = await supabase
                        .from('direct_messages')
                        .insert({})
                        .select()
                        .limit(1)
                        .single();

                    if (dmError) {
                        console.error('Error creating DM:', dmError);
                        return;
                    }

                    // Add both users to the DM
                    const members = [
                        { dm_id: dm.id, user_id: currentUser.id },
                        { dm_id: dm.id, user_id: userId }
                    ];

                    const { error: membersError } = await supabase
                        .from('direct_message_members')
                        .insert(members);

                    if (membersError) {
                        console.error('Error adding DM members:', membersError);
                        return;
                    }

                    // Send system message about DM creation
                    const systemMessage = {
                        content: 'A Direct Message has been created',
                        dm_id: dm.id,
                        is_system_message: true
                    };

                    await messageService.sendMessage(systemMessage);

                    // Navigate to the new DM
                    handleDMSelect(dm.id);
                    setSearchParams({ dm: dm.id });
                } catch (error) {
                    console.error('Error in DM creation:', error);
                }
            };

            startNewDM();
        }
    }, [searchParams]);

    useEffect(() => {
        if (!currentChannelId) return;

        const loadChannelMembers = async () => {
            try {
                // Modified query to not exclude any users
                const { data: members } = await supabase
                    .from('channel_members')
                    .select(`
                        user_id,
                        users (
                            id,
                            username,
                            avatar_url,
                            status
                        )
                    `)
                    .eq('channel_id', currentChannelId);
                
                if (members) {
                    const uniqueMembers = members.reduce((acc, member) => {
                        if (member.users) {
                            acc[member.users.id] = member.users;
                        }
                        return acc;
                    }, {});
                    setChannelMembers(Object.values(uniqueMembers));
                }
            } catch (error) {
                console.error('Error loading channel members:', error);
            }
        };

        // Subscribe to realtime updates for users
        const channel = supabase
            .channel('users-channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'users'
            }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setChannelMembers(prev => prev.map(member =>
                        member.id === payload.new.id ? { ...member, ...payload.new } : member
                    ));
                }
            })
            .subscribe();

        loadChannelMembers();
        
        // Refresh member list periodically to ensure status is current
        const intervalId = setInterval(loadChannelMembers, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(intervalId);
        };
    }, [currentChannelId]);

    const getStatusColor = (status) => {
        if (status?.includes('|')) {
            const [, color] = status.split('|');
            return color;
        }

        const colors = {
            online: '#22c55e',
            away: '#eab308',
            busy: '#ef4444',
            offline: '#6b7280'
        };

        return colors[status] || '#9333ea';
    };

    useEffect(() => {
        const loadAllUsers = async () => {
            try {
                const { data: users, error } = await supabase
                    .from('users')
                    .select('id, username, avatar_url, status');

                if (error) throw error;
                setAllUsers(users || []);
            } catch (error) {
                console.error('Error loading users:', error);
            }
        };

        // Subscribe to realtime updates for all users
        const channel = supabase
            .channel('all-users-channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'users'
            }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setAllUsers(prev => prev.map(user =>
                        user.id === payload.new.id ? { ...user, ...payload.new } : user
                    ));
                }
            })
            .subscribe();

        loadAllUsers();
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#1a1a1a]">
            <Header onLogout={onLogout} />
            <div className="flex flex-1 h-[calc(100vh-64px)]">
                {/* Sidebar */}
                <div className="w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto">
                    <div className="p-4">
                        <h2 className="text-lg font-semibold mb-4 text-white">Channels</h2>
                        <ChannelList
                            onChannelSelect={handleChannelSelect}
                            selectedChannelId={currentChannelId}
                            channels={channels}
                            setChannels={setChannels}
                        />
                        <DirectMessageList
                            onDMSelect={handleDMSelect}
                            selectedDMId={selectedDMId}
                        />
                        <UserList />
                    </div>
                </div>

                {/* Main chat area */}
                <div className="flex-1 flex">
                    {activeThread ? (
                        <ThreadView
                            parentMessage={activeThread}
                            onClose={() => setActiveThread(null)}
                            onParentReactionUpdate={(reactions) => {
                                setMessages(prev => prev.map(msg =>
                                    msg.id === activeThread.id ? { ...msg, reactions } : msg
                                ));
                                setActiveThread(prev => ({ ...prev, reactions }));
                            }}
                        />
                    ) : (
                        <div className="flex-1 flex">
                            {/* Main chat content */}
                            <div className="flex-1 flex flex-col">
                                {/* Channel info bar */}
                                {!selectedDMId && currentChannel && (
                                    <ChannelInfoBar
                                        channel={currentChannel}
                                        onViewPinnedMessages={handleViewPinnedMessages}
                                        onLeaveChannel={handleLeaveChannel}
                                        onChannelUpdated={handleChannelUpdate}
                                        onDeleteChannel={handleChannelDelete}
                                    />
                                )}

                                {selectedDMId && dmParticipants.length > 0 && (
                                    <div className="bg-[#1a1a1a] border-b border-gray-800 px-6 py-3">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-semibold text-white">
                                                {dmParticipants
                                                    .filter(p => p.id !== currentUser.id)
                                                    .map(p => p.username)
                                                    .join(', ')}
                                            </h2>
                                            <div className="flex items-center space-x-4">
                                                <button
                                                    onClick={() => handleViewPinnedMessages(!showPinnedMessages)}
                                                    className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm ${
                                                        showPinnedMessages
                                                            ? 'bg-blue-600 text-white'
                                                            : 'text-gray-400 hover:bg-gray-800'
                                                    }`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M9.293 1.293a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 4.414V13a1 1 0 11-2 0V4.414L7.707 5.707a1 1 0 01-1.414-1.414l3-3z" />
                                                    </svg>
                                                    <span>{showPinnedMessages ? 'Show All Messages' : 'Show Pinned Messages'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Messages area */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {(showPinnedMessages ? pinnedMessages : messages)
                                        .filter(message => !message.parent_id) // Only show messages that are not replies
                                        .map((message) => (
                                            <div key={message.id} className={message.type === 'system' ? systemMessageStyles.container : 'flex items-start space-x-3'}>
                                                {message.type === 'system' ? (
                                                    <div className={systemMessageStyles.content}>
                                                        <span className={systemMessageStyles.label}>System</span>
                                                        <span>{message.content}</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
                                                            {message.sender?.avatar_url && (
                                                                <img
                                                                    src={message.sender.avatar_url}
                                                                    alt="avatar"
                                                                    className="w-8 h-8 rounded-full"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="font-semibold text-sm text-white">
                                                                    {message.sender?.username || 'Unknown User'}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {message.is_edited && (
                                                                    <span className="text-xs text-gray-400">(edited)</span>
                                                                )}
                                                                {message.sender?.id === currentUser.id && (
                                                                    <button
                                                                        onClick={() => handleDeleteMessage(message.id)}
                                                                        className="text-xs text-red-500 hover:text-red-700"
                                                                        title="Delete message"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {editingMessageId === message.id ? (
                                                                <EditMessageForm
                                                                    message={message}
                                                                    onSave={(content) => handleEditMessage(message.id, content)}
                                                                    onCancel={() => setEditingMessageId(null)}
                                                                />
                                                            ) : (
                                                                <>
                                                                    <FormattedMessage 
                                                                        content={message.content} 
                                                                        file={message.file} 
                                                                        message={message} 
                                                                        onEdit={handleEditMessage}
                                                                        onPin={handlePinMessage}
                                                                        replyButton={!message.parent_id && (
                                                                            <button
                                                                                onClick={() => setActiveThread(message)}
                                                                                className="text-xs text-gray-400 hover:text-gray-200 flex items-center space-x-1 transition-colors duration-150"
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                                    <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                                </svg>
                                                                                <span>
                                                                                    {replyCounts[message.id] ? `${replyCounts[message.id]} ${replyCounts[message.id] === 1 ? 'reply' : 'replies'}` : 'Reply'}
                                                                                </span>
                                                                            </button>
                                                                        )}
                                                                        reactionButton={
                                                                            <MessageReactions
                                                                                reactions={message.reactions}
                                                                                onReact={handleReaction}
                                                                                messageId={message.id}
                                                                            />
                                                                        }
                                                                    />
                                                                </>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    {typingUsers.length > 0 && (
                                        <div className="text-sm text-gray-500 italic">
                                            {typingUsers.map(user => user.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Message input */}
                                <form onSubmit={handleSubmit} className="p-4 border-t border-r-0">
                                    <div className="flex flex-col space-y-2 mr-[-1px]">
                                        {/* Markdown toolbar */}
                                        <div className="flex items-center space-x-2 px-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const textarea = document.querySelector('input[type="text"]');
                                                    const start = textarea.selectionStart;
                                                    const end = textarea.selectionEnd;
                                                    const newText = newMessage.substring(0, start) + '**' + newMessage.substring(start, end) + '**' + newMessage.substring(end);
                                                    setNewMessage(newText);
                                                    textarea.focus();
                                                }}
                                                className="p-1 text-gray-400 hover:text-white rounded"
                                                title="Bold"
                                            >
                                                <strong>B</strong>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const textarea = document.querySelector('input[type="text"]');
                                                    const start = textarea.selectionStart;
                                                    const end = textarea.selectionEnd;
                                                    const newText = newMessage.substring(0, start) + '*' + newMessage.substring(start, end) + '*' + newMessage.substring(end);
                                                    setNewMessage(newText);
                                                    textarea.focus();
                                                }}
                                                className="p-1 text-gray-400 hover:text-white rounded italic"
                                                title="Italic"
                                            >
                                                I
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const textarea = document.querySelector('input[type="text"]');
                                                    const start = textarea.selectionStart;
                                                    const end = textarea.selectionEnd;
                                                    const newText = newMessage.substring(0, start) + '~~' + newMessage.substring(start, end) + '~~' + newMessage.substring(end);
                                                    setNewMessage(newText);
                                                    textarea.focus();
                                                }}
                                                className="p-1 text-gray-400 hover:text-white rounded line-through"
                                                title="Strikethrough"
                                            >
                                                S
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const textarea = document.querySelector('input[type="text"]');
                                                    const start = textarea.selectionStart;
                                                    const end = textarea.selectionEnd;
                                                    const newText = newMessage.substring(0, start) + '`' + newMessage.substring(start, end) + '`' + newMessage.substring(end);
                                                    setNewMessage(newText);
                                                    textarea.focus();
                                                }}
                                                className="p-1 text-gray-400 hover:text-white rounded font-mono"
                                                title="Code"
                                            >
                                                {'</>'}
                                            </button>
                                            <div className="h-4 w-px bg-gray-700 mx-1"></div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const textarea = document.querySelector('input[type="text"]');
                                                    const start = textarea.selectionStart;
                                                    const end = textarea.selectionEnd;
                                                    const newText = newMessage.substring(0, start) + '> ' + newMessage.substring(start, end) + newMessage.substring(end);
                                                    setNewMessage(newText);
                                                    textarea.focus();
                                                }}
                                                className="p-1 text-gray-400 hover:text-white rounded"
                                                title="Quote"
                                            >
                                                "
                                            </button>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => {
                                                    setNewMessage(e.target.value);
                                                    handleTyping();
                                                }}
                                                placeholder="Type a message... (supports Markdown formatting)"
                                                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#1a1a1a] text-white placeholder-gray-400"
                                            />
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newMessage.trim()}
                                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                            >
                                                Send
                                            </button>
                                        </div>
                                        <div className="flex justify-end">
                                            <FormattingGuide />
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Right sidebar */}
                            <div className="w-64 bg-gray-900 border-l border-gray-800 border-b border-b-white overflow-y-auto h-[calc(100vh-64px-146px)]">
                                <div className="p-4">
                                    {/* Toggle buttons */}
                                    <div className="flex space-x-1 mb-4">
                                        <button 
                                            onClick={() => setRightSidebarView('presence')}
                                            className={`flex-1 p-2 text-white hover:bg-gray-800 rounded-lg flex items-center justify-center ${
                                                rightSidebarView === 'presence' ? 'bg-gray-800' : 'bg-[#1a1a1a]'
                                            }`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                            </svg>
                                        </button>
                                        <button 
                                            onClick={() => setRightSidebarView('search')}
                                            className={`flex-1 p-2 text-white hover:bg-gray-800 rounded-lg flex items-center justify-center ${
                                                rightSidebarView === 'search' ? 'bg-gray-800' : 'bg-[#1a1a1a]'
                                            }`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    {rightSidebarView === 'presence' ? (
                                        <div className="space-y-2">
                                            <h2 className="text-lg font-semibold mb-4 text-white">Online Users</h2>
                                            <div className="space-y-2">
                                                {allUsers
                                                    .filter(user => user.status !== 'offline')
                                                    .map(user => (
                                                        <div key={user.id} className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-gray-800">
                                                            <div className="relative">
                                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0">
                                                                    {user.avatar_url && (
                                                                        <img
                                                                            src={user.avatar_url}
                                                                            alt={user.username}
                                                                            className="w-8 h-8 rounded-full"
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div 
                                                                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900"
                                                                    style={{ backgroundColor: getStatusColor(user.status) }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-white">{user.username}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                            
                                            <h2 className="text-lg font-semibold mb-4 mt-6 text-white">Offline Users</h2>
                                            <div className="space-y-2">
                                                {channelMembers
                                                    .filter(member => member.status === 'offline')
                                                    .map(member => (
                                                        <div key={member.id} className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-gray-800">
                                                            <div className="relative">
                                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0">
                                                                    {member.avatar_url && (
                                                                        <img
                                                                            src={member.avatar_url}
                                                                            alt={member.username}
                                                                            className="w-8 h-8 rounded-full"
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div 
                                                                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900"
                                                                    style={{ backgroundColor: getStatusColor(member.status) }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-gray-400">{member.username}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <h2 className="text-lg font-semibold mb-4 text-white">Search</h2>
                                        /* Search content will go here */
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

Chat.propTypes = {
    onLogout: PropTypes.func.isRequired
};

export default Chat; 