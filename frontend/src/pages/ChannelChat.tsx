import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useParams } from 'react-router-dom';
import MessageList from '../components/messages/MessageList';
import MessageInput from '../components/messages/MessageInput';
import RightSidebar from '../components/chat/RightSidebar';

const ChannelChat = () => {
    const { id } = useParams();
    const [showPresence, setShowPresence] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    const handlePresenceClick = () => {
        setShowPresence(true);
        setShowSearch(false);
    };

    const handleSearchClick = () => {
        setShowPresence(false);
        setShowSearch(true);
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
            />
        </Box>
    );
};

export default ChannelChat; 