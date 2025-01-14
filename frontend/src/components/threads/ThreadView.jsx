import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import messageService from '../../services/messageService';
import realtimeService from '../../services/realtimeService';
import { getUser } from '../../services/authService';
import MessageReactions from '../messages/MessageReactions';
import FormattedMessage from '../messages/FormattedMessage';
import EditMessageForm from '../messages/EditMessageForm';
import reactionService from '../../services/reactionService';

function ThreadView({ parentMessage, onClose, onParentReactionUpdate }) {
    const [newReply, setNewReply] = useState('');
    const [typingUsers, setTypingUsers] = useState([]);
    const [replies, setReplies] = useState([]);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const repliesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const typingChannelRef = useRef({
        thread: `thread:${parentMessage.id}`,
        parent: parentMessage.dm_id ? `dm:${parentMessage.dm_id}` : `channel:${parentMessage.channel_id}`
    });
    const currentUser = getUser();

    useEffect(() => {
        const loadReplies = async () => {
            try {
                const threadReplies = await messageService.getThreadReplies(parentMessage.id);
                setReplies(threadReplies);
            } catch (error) {
                console.error('Error loading replies:', error);
            }
        };

        loadReplies();

        // Subscribe to realtime updates for this thread
        realtimeService.subscribeToThread(parentMessage.id, (event) => {
            switch (event.type) {
                case 'new_message':
                    setReplies(prev => [...prev, { ...event.message, reactions: [] }]);
                    break;
                case 'message_updated':
                    setReplies(prev => prev.map(msg =>
                        msg.id === event.message.id ? { ...event.message, reactions: msg.reactions } : msg
                    ));
                    break;
                case 'message_deleted':
                    setReplies(prev => {
                        const newReplies = prev.filter(msg => msg.id !== event.messageId);
                        // Only auto-close if there were replies before and now there are none
                        if (prev.length > 0 && newReplies.length === 0) {
                            onClose();
                        }
                        return newReplies;
                    });
                    break;
                case 'reactions_updated':
                    setReplies(prev => prev.map(msg =>
                        msg.id === event.messageId ? { ...msg, reactions: event.reactions } : msg
                    ));
                    break;
            }
        });

        // Subscribe to typing indicators for both thread and parent channel/DM
        const threadTypingChannel = realtimeService.subscribeToTyping(`thread:${parentMessage.id}`, (users) => {
            setTypingUsers(users.filter(user => user.user_id !== currentUser.id));
        });

        const parentTypingChannel = realtimeService.subscribeToTyping(
            parentMessage.dm_id || parentMessage.channel_id,
            () => { } // We don't need to handle parent typing updates in the thread view
        );

        typingChannelRef.current = {
            thread: threadTypingChannel,
            parent: parentTypingChannel
        };

        return () => {
            realtimeService.unsubscribeFromThread(parentMessage.id);
            if (typingChannelRef.current.thread) {
                realtimeService.stopTyping(typingChannelRef.current.thread);
            }
            if (typingChannelRef.current.parent) {
                realtimeService.stopTyping(typingChannelRef.current.parent);
            }
        };
    }, [parentMessage.id, currentUser.id, parentMessage.dm_id, parentMessage.channel_id]);

    useEffect(() => {
        repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [replies]);

    const handleTyping = () => {
        // Start typing in both thread and parent channel/DM
        if (typingChannelRef.current.thread) {
            realtimeService.startTyping(typingChannelRef.current.thread, currentUser);
        }
        if (typingChannelRef.current.parent) {
            realtimeService.startTyping(typingChannelRef.current.parent, currentUser);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout
        typingTimeoutRef.current = setTimeout(() => {
            if (typingChannelRef.current.thread) {
                realtimeService.stopTyping(typingChannelRef.current.thread);
            }
            if (typingChannelRef.current.parent) {
                realtimeService.stopTyping(typingChannelRef.current.parent);
            }
        }, 1000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newReply.trim()) return;

        try {
            const reply = {
                content: newReply.trim(),
                channel_id: parentMessage.channel_id,
                dm_id: parentMessage.dm_id,
                parent_id: parentMessage.id
            };

            await messageService.sendMessage(reply);
            setNewReply('');

            // Clear typing indicators in both thread and parent
            if (typingChannelRef.current.thread) {
                realtimeService.stopTyping(typingChannelRef.current.thread);
            }
            if (typingChannelRef.current.parent) {
                realtimeService.stopTyping(typingChannelRef.current.parent);
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        } catch (error) {
            console.error('Error sending reply:', error);
        }
    };

    const handleEditMessage = async (messageId, newContent) => {
        try {
            const updatedMessage = await messageService.editMessage(messageId, newContent);
            setReplies(prev => prev.map(msg =>
                msg.id === messageId ? { ...updatedMessage, reactions: msg.reactions } : msg
            ));
            setEditingMessageId(null);
        } catch (error) {
            console.error('Error editing reply:', error);
        }
    };

    const handleDeleteReply = async (messageId) => {
        if (!window.confirm('Are you sure you want to delete this reply?')) {
            return;
        }

        try {
            await messageService.deleteMessage(messageId);
            setReplies(prev => {
                const newReplies = prev.filter(msg => msg.id !== messageId);
                // Only auto-close if there were replies before and now there are none
                if (prev.length > 0 && newReplies.length === 0) {
                    onClose();
                }
                return newReplies;
            });
        } catch (error) {
            console.error('Error deleting reply:', error);
        }
    };

    const handleReaction = async (messageId, emoji) => {
        try {
            await reactionService.toggleReaction(messageId, emoji);
            const reactions = await reactionService.getMessageReactions(messageId);
            if (messageId === parentMessage.id) {
                // Update parent message reactions
                onParentReactionUpdate?.(reactions);
            } else {
                // Update reply reactions
                setReplies(prev => prev.map(msg =>
                    msg.id === messageId ? { ...msg, reactions } : msg
                ));
            }
        } catch (error) {
            console.error('Error toggling reaction:', error);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white">
            {/* Thread header */}
            <div className="p-4 border-b flex justify-between items-center bg-white">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ←
                    </button>
                    <h3 className="text-lg font-semibold">Thread</h3>
                </div>
            </div>

            {/* Parent message */}
            <div className="p-6 border-b bg-gray-50">
                <div className="flex items-start space-x-3 max-w-3xl mx-auto">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0">
                        {parentMessage.sender?.avatar_url && (
                            <img
                                src={parentMessage.sender.avatar_url}
                                alt="avatar"
                                className="w-10 h-10 rounded-full"
                            />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm">
                                {parentMessage.sender?.username || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-500">
                                {new Date(parentMessage.created_at).toLocaleTimeString()}
                            </span>
                        </div>
                        <FormattedMessage content={parentMessage.content} message={parentMessage} onEdit={handleEditMessage} />
                        <MessageReactions
                            reactions={parentMessage.reactions}
                            onReact={handleReaction}
                            messageId={parentMessage.id}
                        />
                    </div>
                </div>
            </div>

            {/* Replies */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                <div className="max-w-3xl mx-auto space-y-6">
                    {replies.map((reply) => (
                        <div key={reply.id} className="flex items-start space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0">
                                {reply.sender?.avatar_url && (
                                    <img
                                        src={reply.sender.avatar_url}
                                        alt="avatar"
                                        className="w-10 h-10 rounded-full"
                                    />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-sm">
                                        {reply.sender?.username || 'Unknown User'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(reply.created_at).toLocaleTimeString()}
                                    </span>
                                    {reply.is_edited && (
                                        <span className="text-xs text-gray-400">(edited)</span>
                                    )}
                                    {reply.sender?.id === currentUser.id && (
                                        <button
                                            onClick={() => handleDeleteReply(reply.id)}
                                            className="text-xs text-red-500 hover:text-red-700"
                                            title="Delete reply"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                                {editingMessageId === reply.id ? (
                                    <EditMessageForm
                                        message={reply}
                                        onSave={(content) => handleEditMessage(reply.id, content)}
                                        onCancel={() => setEditingMessageId(null)}
                                    />
                                ) : (
                                    <FormattedMessage content={reply.content} message={reply} onEdit={handleEditMessage} />
                                )}
                                <MessageReactions
                                    reactions={reply.reactions}
                                    onReact={handleReaction}
                                    messageId={reply.id}
                                />
                            </div>
                        </div>
                    ))}
                    {typingUsers.length > 0 && (
                        <div className="text-sm text-gray-500 italic">
                            {typingUsers.map(user => user.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                        </div>
                    )}
                    <div ref={repliesEndRef} />
                </div>
            </div>

            {/* Reply input */}
            <div className="border-t bg-white">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4">
                    <div className="flex space-x-4">
                        <input
                            type="text"
                            value={newReply}
                            onChange={(e) => {
                                setNewReply(e.target.value);
                                handleTyping();
                            }}
                            placeholder="Reply to thread..."
                            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={!newReply.trim()}
                            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            Reply
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

ThreadView.propTypes = {
    parentMessage: PropTypes.shape({
        id: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired,
        channel_id: PropTypes.string,
        dm_id: PropTypes.string,
        sender: PropTypes.shape({
            id: PropTypes.string.isRequired,
            username: PropTypes.string.isRequired,
            avatar_url: PropTypes.string
        }),
        created_at: PropTypes.string.isRequired,
        reactions: PropTypes.array
    }).isRequired,
    onClose: PropTypes.func.isRequired,
    onParentReactionUpdate: PropTypes.func
};

export default ThreadView;
