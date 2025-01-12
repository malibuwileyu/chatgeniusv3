import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useAppSelector } from '../../store/hooks';
import { RootState } from '../../store/store';
import { Message as MessageType } from '../../store/slices/messageSlice';
import Message from './Message';
import useMessages from '../../hooks/useMessages';

interface MessageListProps {
    channelId: string;
}

const MessageList = ({ channelId }: MessageListProps) => {
    const messages = useAppSelector((state: RootState) => state.messages.messages);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useMessages(channelId);

    const scrollToBottom = () => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <Box
            ref={containerRef}
            sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'background.default',
                px: 2,
                py: 2,
                '&::-webkit-scrollbar': {
                    width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                    '&:hover': {
                        background: 'rgba(0, 0, 0, 0.3)'
                    }
                }
            }}
        >
            <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                width: '100%',
                pr: 1
            }}>
                {messages.map((message: MessageType) => (
                    <Message
                        key={message.id}
                        message={message}
                    />
                ))}
                <div ref={messagesEndRef} />
            </Box>
        </Box>
    );
};

export default MessageList; 