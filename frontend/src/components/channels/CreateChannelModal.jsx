/**
 * @file CreateChannelModal.jsx
 * @description Modal component for creating new channels. This component provides
 * a form interface for users to create channels with customizable settings.
 * 
 * Core Functionality:
 * - Channel creation form
 * - Input validation
 * - Error handling
 * - Loading state management
 * 
 * Features:
 * - Channel name input
 * - Optional description
 * - Private/Public toggle
 * - Form validation
 * - Loading indicators
 * - Error display
 * - Modal visibility control
 * - Form state reset
 * 
 * Props:
 * - isOpen: Boolean to control modal visibility
 * - onClose: Function to handle modal close
 * - onChannelCreated: Function to handle successful channel creation
 * 
 * Dependencies:
 * - react
 * - prop-types
 * - ../../services/channelService
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import channelService from '../../services/channelService';

function CreateChannelModal({ isOpen, onClose, onChannelCreated }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const channelData = {
                name: name.trim(),
                description: description.trim(),
                is_private: isPrivate
            };

            console.log("Client: [handleSubmit] Creating channel with data:", channelData);

            const channel = await channelService.createChannel(channelData);
            onChannelCreated(channel);
            onClose();

            // Reset form
            setName('');
            setDescription('');
            setIsPrivate(false);
        } catch (error) {
            console.error("Client: [handleSubmit] Error creating channel:", error);
            setError(error.response?.data?.message || 'Error creating channel');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#1a1a1a] rounded-lg shadow-xl w-full max-w-md relative z-[51]">
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4 text-white">Create New Channel</h2>
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
                                    className="mt-1 block w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                                    className="mt-1 block w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-700 rounded bg-[#1a1a1a]"
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

                        <div className="mt-6 flex justify-end space-x-3">
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
                                {isLoading ? 'Creating...' : 'Create Channel'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

CreateChannelModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onChannelCreated: PropTypes.func.isRequired
};

export default CreateChannelModal; 