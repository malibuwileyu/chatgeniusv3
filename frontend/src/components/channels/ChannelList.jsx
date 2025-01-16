/**
 * @file ChannelList.jsx
 * @description Channel list component that displays available channels and provides
 * options to browse or create new channels. This component serves as the main
 * navigation interface for channels.
 * 
 * Core Functionality:
 * - Display list of channels
 * - Channel selection
 * - Channel creation modal
 * - Channel browsing navigation
 * 
 * Features:
 * - Interactive channel selection
 * - Add channel dropdown menu
 * - Create channel modal integration
 * - Browse channels navigation
 * - Visual selection indicators
 * - Responsive design
 * 
 * Props:
 * - onChannelSelect: Function to handle channel selection
 * - selectedChannelId: Currently selected channel ID
 * - channels: Array of channel objects
 * - setChannels: Function to update channels list
 * 
 * Dependencies:
 * - react
 * - react-router-dom
 * - prop-types
 * - ./CreateChannelModal
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import CreateChannelModal from './CreateChannelModal';
import EditChannelModal from './EditChannelModal';

function ChannelList({ onChannelSelect, selectedChannelId, channels, setChannels }) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showAddOptions, setShowAddOptions] = useState(false);
    const [editingChannel, setEditingChannel] = useState(null);
    const navigate = useNavigate();

    const handleChannelCreated = (channel) => {
        setChannels(prev => [...prev, channel]);
        onChannelSelect(channel.id);
    };

    const handleChannelUpdated = (updatedChannel) => {
        setChannels(prev => prev.map(ch => ch.id === updatedChannel.id ? updatedChannel : ch));
        setEditingChannel(null);
    };

    const handleLeaveChannel = (channelId) => {
        setChannels(prev => prev.filter(ch => ch.id !== channelId));
        if (selectedChannelId === channelId) {
            onChannelSelect(null);
        }
        setEditingChannel(null);
    };

    const handleDeleteChannel = (channelId) => {
        setChannels(prev => prev.filter(ch => ch.id !== channelId));
        if (selectedChannelId === channelId) {
            onChannelSelect(null);
        }
        setEditingChannel(null);
    };

    const handleAddClick = () => {
        setShowAddOptions(true);
    };

    const handleBrowseClick = () => {
        navigate('/browse-channels');
        setShowAddOptions(false);
    };

    const handleCreateClick = () => {
        setIsCreateModalOpen(true);
        setShowAddOptions(false);
    };

    return (
        <div className="space-y-1">
            {channels.map((channel) => (
                <div key={channel.id} className="flex items-center group">
                    <button
                        onClick={() => onChannelSelect(channel.id)}
                        className={`flex-grow text-left px-2 py-1 rounded-l text-white hover:bg-gray-800 ${selectedChannelId === channel.id ? 'bg-gray-800' : ''}`}
                    >
                        # {channel.name}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingChannel(channel);
                        }}
                        className={`px-2 py-2 rounded-r text-gray-400 hover:text-white hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity ${selectedChannelId === channel.id ? 'bg-gray-800' : ''}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            ))}

            {/* Add Channel Section */}
            <div className="relative">
                <button
                    onClick={handleAddClick}
                    className="w-full text-left px-2 py-1 rounded hover:bg-gray-800 text-white flex items-center"
                >
                    <span className="mr-1">+</span> Add Channels
                </button>

                {/* Add Options Dropdown */}
                {showAddOptions && (
                    <div className="absolute left-0 mt-1 w-48 rounded-md shadow-lg bg-[#1a1a1a] ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1" role="menu">
                            <button
                                onClick={handleBrowseClick}
                                className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800"
                                role="menuitem"
                            >
                                Browse Channels
                            </button>
                            <button
                                onClick={handleCreateClick}
                                className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800"
                                role="menuitem"
                            >
                                Create Channel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Channel Modal */}
            <CreateChannelModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onChannelCreated={handleChannelCreated}
            />

            {/* Edit Channel Modal */}
            {editingChannel && (
                <EditChannelModal
                    isOpen={!!editingChannel}
                    onClose={() => setEditingChannel(null)}
                    channel={editingChannel}
                    onChannelUpdated={handleChannelUpdated}
                    onLeaveChannel={handleLeaveChannel}
                    onDeleteChannel={handleDeleteChannel}
                />
            )}
        </div>
    );
}

ChannelList.propTypes = {
    onChannelSelect: PropTypes.func.isRequired,
    selectedChannelId: PropTypes.string,
    channels: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        created_by: PropTypes.string.isRequired
    })).isRequired,
    setChannels: PropTypes.func.isRequired
};

export default ChannelList;
