/**
 * @file EditChannelModal.jsx
 * @description Modal component for editing channel settings and managing channel
 * membership. This component provides different interfaces for channel creators
 * and regular members, allowing appropriate management actions.
 * 
 * Core Functionality:
 * - Channel settings management
 * - Channel membership control
 * - Creator-specific actions
 * - Permission handling
 * 
 * Features:
 * - Channel name editing
 * - Description management
 * - Privacy toggle
 * - Channel deletion
 * - Channel leaving
 * - Permission-based UI
 * - Form validation
 * - Loading states
 * - Error handling
 * - Confirmation dialogs
 * 
 * Props:
 * - isOpen: Boolean to control modal visibility
 * - onClose: Function to handle modal close
 * - channel: Channel object with details
 * - onChannelUpdated: Function to handle channel updates
 * - onLeaveChannel: Function to handle leaving channel
 * - onDeleteChannel: Function to handle channel deletion
 * 
 * Dependencies:
 * - react
 * - prop-types
 * - ../../services/channelService
 * - ../../services/auth
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import channelService from '../../services/channelService';
import { getUser } from '../../services/authService';

function EditChannelModal({ isOpen, onClose, channel, onChannelUpdated, onLeaveChannel, onDeleteChannel }) {
    const [name, setName] = useState(channel?.name || '');
    const [description, setDescription] = useState(channel?.description || '');
    const [isPrivate, setIsPrivate] = useState(channel?.is_private || false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const currentUser = getUser();
    const isCreator = channel?.created_by === currentUser.id;

    // Update local state when channel prop changes
    useEffect(() => {
        if (channel) {
            setName(channel.name);
            setDescription(channel.description || '');
            setIsPrivate(channel.is_private || false);
        }
    }, [channel]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isCreator) {
            setError('Only the channel creator can edit the channel');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const channelData = {
                name: name.trim(),
                description: description.trim(),
                is_private: isPrivate
            };

            const updatedChannel = await channelService.updateChannel(channel.id, channelData);
            onChannelUpdated(updatedChannel);
            onClose();
        } catch (error) {
            setError(error.response?.data?.message || 'Error updating channel');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveChannel = () => {
        if (window.confirm('Are you sure you want to leave this channel?')) {
            onLeaveChannel();
            onClose();
        }
    };

    const handleDeleteChannel = async () => {
        if (!isCreator) {
            setError('Only the channel creator can delete the channel');
            return;
        }

        if (window.confirm('Are you sure you want to delete this channel? This action cannot be undone.')) {
            setIsLoading(true);
            try {
                await channelService.deleteChannel(channel.id);
                onDeleteChannel();
                onClose();
            } catch (error) {
                setError(error.response?.data?.message || 'Error deleting channel');
                setIsLoading(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a1a] rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4 text-white">Channel Settings</h2>
                    {isCreator ? (
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-white">
                                        Channel Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="e.g. general"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-white">
                                        Description
                                    </label>
                                    <textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="What's this channel about?"
                                        rows="3"
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isPrivate"
                                        checked={isPrivate}
                                        onChange={(e) => setIsPrivate(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-700 rounded"
                                    />
                                    <label htmlFor="isPrivate" className="ml-2 block text-sm text-white">
                                        Make channel private
                                    </label>
                                </div>

                                {error && (
                                    <div className="text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-between">
                                <div className="flex space-x-3">
                                    <button
                                        type="button"
                                        onClick={handleDeleteChannel}
                                        className="px-4 py-2 border border-red-900 text-red-400 rounded-md shadow-sm text-sm font-medium hover:bg-red-900 hover:bg-opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                        disabled={isLoading}
                                    >
                                        Delete Channel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleLeaveChannel}
                                        className="px-4 py-2 border border-yellow-900 text-yellow-400 rounded-md shadow-sm text-sm font-medium hover:bg-yellow-900 hover:bg-opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                                        disabled={isLoading}
                                    >
                                        Leave Channel
                                    </button>
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-white bg-[#1a1a1a] hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !name.trim()}
                                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {isLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-medium text-white">Channel Information</h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-300">
                                        <span className="font-medium">Name:</span> {channel.name}
                                    </p>
                                    {channel.description && (
                                        <p className="text-sm text-gray-300 mt-1">
                                            <span className="font-medium">Description:</span> {channel.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between pt-4">
                                <button
                                    type="button"
                                    onClick={handleLeaveChannel}
                                    className="px-4 py-2 border border-red-900 text-red-400 rounded-md shadow-sm text-sm font-medium hover:bg-red-900 hover:bg-opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    Leave Channel
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-white bg-[#1a1a1a] hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

EditChannelModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    channel: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        is_private: PropTypes.bool,
        created_by: PropTypes.string.isRequired
    }),
    onChannelUpdated: PropTypes.func.isRequired,
    onLeaveChannel: PropTypes.func.isRequired,
    onDeleteChannel: PropTypes.func.isRequired
};

export default EditChannelModal; 