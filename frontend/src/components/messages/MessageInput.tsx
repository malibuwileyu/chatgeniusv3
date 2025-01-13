import React, { useState, useRef } from 'react';
import { Box, TextField, IconButton, Stack } from '@mui/material';
import { Send as SendIcon, AttachFile as AttachFileIcon } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { RootState } from '../../store/store';
import { supabase } from '../../services/supabase';
import FileService, { FileUploadProgress } from '../../services/fileService';
import FilePreview from './FilePreview';

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
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentUpload, setCurrentUpload] = useState<{
        url: string;
        fileName: string;
        fileType: string;
        fileSize: number;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    const handleSendMessage = async () => {
        if (!message.trim() && !currentUpload) return;

        try {
            let messageData = {
                channel_id: channelId,
                user_id: currentUser?.id,
                content: message.trim() || currentUpload?.fileName || '',
                type: currentUpload ? 'file' : 'text'
            };

            // Create message
            const { data: messageRecord, error: messageError } = await supabase
                .from('messages')
                .insert([messageData])
                .select<'*', SupabaseMessage>()
                .single();

            if (messageError) throw messageError;

            // If we have a file, create the attachment record
            if (currentUpload) {
                const { error: attachmentError } = await supabase
                    .from('attachments')
                    .insert([{
                        message_id: messageRecord.id,
                        file_url: currentUpload.url,
                        file_type: currentUpload.fileType,
                        file_name: currentUpload.fileName,
                        file_size: currentUpload.fileSize
                    }]);

                if (attachmentError) throw attachmentError;
                setCurrentUpload(null); // Clear the upload only after successful send
            }

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

        // Set preview immediately
        setCurrentUpload({
            url: '',
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
        });

        setIsUploading(true);
        setUploadProgress(0);
        
        try {
            const result = await FileService.uploadFile(
                file,
                channelId,
                (progress: FileUploadProgress) => {
                    setUploadProgress(progress.progress);
                }
            );

            // Update preview with the actual URL
            setCurrentUpload(result);

        } catch (error) {
            console.error('Error uploading file:', error);
            // Don't clear preview on error, just show error state
            setCurrentUpload(prev => prev ? {
                ...prev,
                url: '' // Clear URL if upload failed
            } : null);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <Box 
            sx={{ 
                pl: 2,
                pr: 4,
                py: 2,
                borderTop: 1,
                borderRight: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                flexShrink: 0
            }}
        >
            {currentUpload && (
                <Box sx={{ mb: 1 }}>
                    <FilePreview
                        fileUrl={currentUpload.url}
                        fileName={currentUpload.fileName}
                        fileType={currentUpload.fileType}
                        fileSize={currentUpload.fileSize}
                        isUploading={isUploading}
                        uploadProgress={uploadProgress}
                        onRemove={() => setCurrentUpload(null)}
                    />
                </Box>
            )}
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
                    placeholder={currentUpload ? "Add a message or send file directly..." : "Type a message..."}
                    disabled={isUploading}
                    sx={{ 
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                        }
                    }}
                />
                <IconButton
                    onClick={handleSendMessage}
                    disabled={(!message.trim() && !currentUpload) || isUploading}
                    color="primary"
                >
                    <SendIcon />
                </IconButton>
            </Stack>
        </Box>
    );
};

export default MessageInput; 