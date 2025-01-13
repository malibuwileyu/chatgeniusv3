import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { useParams } from 'react-router-dom';
import MessageList from '../components/messages/MessageList';
import MessageInput from '../components/messages/MessageInput';
import RightSidebar from '../components/chat/RightSidebar';
import usePresence from '../hooks/usePresence';

const ChannelChat: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [showPresence, setShowPresence] = useState(true);
    const [showSearch, setShowSearch] = useState(false);

    useEffect(() => {
        setShowPresence(true);
        setShowSearch(false);
    }, [id]);

    const handlePresenceClick = () => {
        setShowPresence(prev => !prev);
        setShowSearch(false);
    };

    const handleSearchClick = () => {
        setShowPresence(false);
        setShowSearch(prev => !prev);
    };

    if (!id) return null;

    return (
        <Box sx={{ 
            display: 'flex',
            height: 'calc(100vh - 64px)', // Full height minus app bar
            position: 'fixed',
            top: 64, // Below app bar
            right: 0,
            bottom: 0,
            left: { xs: 0, md: 240 }, // Account for left sidebar
        }}>
            <Box sx={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0 // Allow flex child to shrink below its content size
            }}>
                <MessageList channelId={id} />
                <MessageInput channelId={id} />
            </Box>
            <RightSidebar 
                onPresenceClick={handlePresenceClick}
                onSearchClick={handleSearchClick}
                showPresence={showPresence}
                showSearch={showSearch}
                channelId={id}
                onClose={handlePresenceClick}
            />
        </Box>
    );
};

export default ChannelChat; 