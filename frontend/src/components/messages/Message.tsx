import React, { useEffect, useState } from 'react';
import { Box, Typography, Avatar, IconButton, Stack } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { Message as MessageType } from '../../store/slices/messageSlice';
import { supabase } from '../../services/supabase';
import FilePreview from './FilePreview';

interface MessageProps {
    message: MessageType;
}

interface Attachment {
    id: string;
    file_url: string;
    file_type: string;
    file_name: string;
    file_size: number;
}

const Message: React.FC<MessageProps> = ({ message }) => {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [showDelete, setShowDelete] = useState(false);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        const fetchAttachments = async () => {
            if (message.type !== 'file') return;

            const { data, error } = await supabase
                .from('attachments')
                .select('*')
                .eq('message_id', message.id);

            if (error) {
                console.error('Error fetching attachments:', error);
                return;
            }

            setAttachments(data || []);
        };

        fetchAttachments();
    }, [message.id, message.type]);

    const handleDelete = async () => {
        try {
            console.log('Starting delete operation for message:', message.id);
            
            // If it's a file message, delete the attachments from storage first
            if (message.type === 'file' && attachments.length > 0) {
                console.log('Deleting file attachments from storage');
                for (const attachment of attachments) {
                    // Extract the file path from the URL
                    const filePath = attachment.file_url.split('/').pop();
                    if (filePath) {
                        console.log('Deleting file:', filePath);
                        const { error: storageError } = await supabase.storage
                            .from('attachments')
                            .remove([filePath]);
                        
                        if (storageError) {
                            console.error('Error deleting file from storage:', storageError);
                        }
                    }
                }
            }

            // Delete the message (this will cascade delete attachments in the database)
            console.log('Deleting message from database:', message.id);
            const { error, data } = await supabase
                .from('messages')
                .delete()
                .eq('id', message.id)
                .select()
                .single();

            if (error) {
                console.error('Error deleting message:', error);
                throw error;
            }
            
            console.log('Message deleted successfully:', data);
        } catch (error) {
            console.error('Error in handleDelete:', error);
        }
    };

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
                backgroundColor: 'background.paper',
                position: 'relative',
                '&:hover .delete-button': {
                    opacity: 1,
                    visibility: 'visible'
                }
            }}
            onMouseEnter={() => setShowDelete(true)}
            onMouseLeave={() => setShowDelete(false)}
        >
            <IconButton
                className="delete-button"
                onClick={handleDelete}
                size="small"
                color="error"
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    opacity: 0,
                    visibility: 'hidden',
                    transition: 'opacity 0.2s, visibility 0.2s'
                }}
            >
                <DeleteIcon fontSize="small" />
            </IconButton>

            <Avatar src={message.user?.avatar_url}>
                {message.user?.full_name?.charAt(0) || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" color="text.secondary">
                        {message.user?.full_name || 'Unknown User'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {formatTime(message.created_at)}
                    </Typography>
                </Stack>
                
                {/* Show attachments first if they exist */}
                {message.type === 'file' && attachments.map((attachment) => (
                    <Box key={attachment.id} sx={{ mt: 1, mb: 1 }}>
                        <FilePreview
                            fileUrl={attachment.file_url}
                            fileName={attachment.file_name}
                            fileType={attachment.file_type}
                            fileSize={attachment.file_size}
                        />
                    </Box>
                ))}
                
                {/* Always show the message content if it exists */}
                {message.content && (
                    <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                        {message.content}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default Message; 