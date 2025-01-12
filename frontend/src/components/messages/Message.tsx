import React from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { Message as MessageType } from '../../store/slices/messageSlice';

interface MessageProps {
    message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                gap: 2,
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                width: '100%',
                backgroundColor: 'background.paper'
            }}
        >
            <Avatar src={message.user?.avatar_url}>
                {message.user?.full_name?.charAt(0) || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    {message.user?.full_name || 'Unknown User'}
                </Typography>
                <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                    {message.content}
                </Typography>
                {message.attachments && message.attachments.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        {message.attachments.map((attachment, index) => (
                            <Typography
                                key={index}
                                variant="body2"
                                color="primary"
                                component="a"
                                href={attachment.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                📎 {attachment.file_name}
                            </Typography>
                        ))}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default Message; 