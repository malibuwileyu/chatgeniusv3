/**
 * @file ChannelInfoBar.jsx
 * @description Channel information bar component that displays channel details and
 * provides access to channel management features. This component serves as the top
 * bar for channel-specific actions and information.
 * 
 * Core Functionality:
 * - Display channel name and description
 * - Pinned messages toggle
 * - Channel settings access
 * - Channel management actions
 * 
 * Features:
 * - Interactive pinned messages toggle
 * - Channel settings modal integration
 * - Channel update functionality
 * - Channel leave/delete options
 * - Visual state indicators
 * - Responsive design
 * 
 * Props:
 * - channel: Channel object with details
 * - onViewPinnedMessages: Function to handle pinned messages view
 * - onLeaveChannel: Function to handle channel leave
 * - onChannelUpdated: Function to handle channel updates
 * - onDeleteChannel: Function to handle channel deletion
 * 
 * Dependencies:
 * - react
 * - prop-types
 * - ./EditChannelModal
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import PropTypes from 'prop-types';
import { useState } from 'react';
import EditChannelModal from './EditChannelModal';

function ChannelInfoBar({ channel, onViewPinnedMessages, onLeaveChannel, onChannelUpdated, onDeleteChannel }) {
    const [showPinnedMessages, setShowPinnedMessages] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const handlePinnedClick = () => {
        setShowPinnedMessages(!showPinnedMessages);
        onViewPinnedMessages(!showPinnedMessages);
    };

    return (
        <div className="bg-[#1a1a1a] border-b border-gray-700 px-6 py-3">
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-white">
                        {channel.name}
                    </h2>
                    {channel.description && (
                        <p className="text-sm text-gray-400 truncate mt-0.5">
                            {channel.description}
                        </p>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handlePinnedClick}
                        className={`flex items-center space-x-1 px-3 py-1 rounded hover:bg-gray-800 ${showPinnedMessages ? 'bg-gray-800 text-yellow-500' : 'text-white'}`}
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16a1 1 0 11-2 0V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 013 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L7 4.323V3a1 1 0 011-1h2z" />
                        </svg>
                        <span className="text-sm font-medium">Pinned</span>
                    </button>
                </div>
            </div>

            <EditChannelModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                channel={channel}
                onChannelUpdated={(updatedChannel) => {
                    onChannelUpdated(updatedChannel);
                    setShowSettingsModal(false);
                }}
                onLeaveChannel={onLeaveChannel}
                onDeleteChannel={onDeleteChannel}
            />
        </div>
    );
}

ChannelInfoBar.propTypes = {
    channel: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        created_by: PropTypes.string.isRequired
    }).isRequired,
    onViewPinnedMessages: PropTypes.func.isRequired,
    onLeaveChannel: PropTypes.func.isRequired,
    onChannelUpdated: PropTypes.func.isRequired,
    onDeleteChannel: PropTypes.func.isRequired
};

export default ChannelInfoBar; 