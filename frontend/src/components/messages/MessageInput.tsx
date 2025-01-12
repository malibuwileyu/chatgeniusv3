import React, { useState, useRef } from 'react';
import { Box, TextField, IconButton, Stack } from '@mui/material';
import { Send as SendIcon, AttachFile as AttachFileIcon } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { RootState } from '../../store/store';
import { supabase } from '../../services/supabase';

interface MessageInputProps {
    channelId: string;
}

interface SupabaseMessage {
    id: string;
    channel_id: string;
    user_id: string;
    content: string;
    type: 'text' | 'file' | 'ai' | 'system';
}

const MessageInput: React.FC<MessageInputProps> = ({ channelId }) => {
    const [message, setMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    const handleSendMessage = async () => {
        if (!message.trim() && !isUploading) return;

        try {
            const { data, error } = await supabase
                .from('messages')
                .insert([{
                    channel_id: channelId,
                    user_id: currentUser?.id,
                    content: message.trim(),
                    type: 'text'
                }])
                .select();

            if (error) throw error;
            setMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${channelId}/${fileName}`;

            // Upload file to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath);

            // Create message with attachment
            const { data: message, error: messageError } = await supabase
                .from('messages')
                .insert([{
                    channel_id: channelId,
                    user_id: currentUser?.id,
                    content: file.name,
                    type: 'file'
                }])
                .select<'*', SupabaseMessage>()
                .single();

            if (messageError) throw messageError;

            // Create attachment record
            const { error: attachmentError } = await supabase
                .from('attachments')
                .insert([{
                    message_id: message.id,
                    file_url: publicUrl,
                    file_type: file.type,
                    file_name: file.name,
                    file_size: file.size
                }]);

            if (attachmentError) throw attachmentError;

        } catch (error) {
            console.error('Error uploading file:', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <Box 
            sx={{ 
                position: 'fixed',
                bottom: 0,
                right: 0,
                left: { xs: 0, md: 240 }, // Adjust based on sidebar width
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                zIndex: 1
            }}
        >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <IconButton
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                    <AttachFileIcon />
                </IconButton>
                <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    disabled={isUploading}
                    sx={{ 
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                        }
                    }}
                />
                <IconButton
                    onClick={handleSendMessage}
                    disabled={!message.trim() && !isUploading}
                    color="primary"
                >
                    <SendIcon />
                </IconButton>
            </Stack>
        </Box>
    );
};

export default MessageInput; 