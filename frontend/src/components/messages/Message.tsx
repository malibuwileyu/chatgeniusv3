import React, { useEffect, useState } from 'react';
import { Box, Typography, Avatar } from '@mui/material';
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
                {message.type === 'text' && (
                    <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                        {message.content}
                    </Typography>
                )}
                {message.type === 'file' && attachments.map((attachment) => (
                    <Box key={attachment.id} sx={{ mt: 1 }}>
                        <FilePreview
                            fileUrl={attachment.file_url}
                            fileName={attachment.file_name}
                            fileType={attachment.file_type}
                            fileSize={attachment.file_size}
                        />
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default Message; 