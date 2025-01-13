import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Stack, InputAdornment } from '@mui/material';
import { Send as SendIcon, AttachFile as AttachFileIcon } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { RootState } from '../../store/store';
import { supabase } from '../../services/supabase';
import FileService, { FileUploadProgress } from '../../services/fileService';
import FilePreview from './FilePreview';
import { usePresence } from '../../contexts/PresenceContext';

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

interface FilePreviewProps {
    fileName: string;
    fileType: string;
    fileSize: number;
    isUploading?: boolean;
    uploadProgress?: number;
    onRemove?: () => void;
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
    const { setTyping } = usePresence(channelId);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();

    const handleSendMessage = async () => {
        if (!message.trim() && !currentUpload) return;
        if (!currentUser) {
            console.error('Cannot send message: User not authenticated');
            return;
        }

        try {
            // First verify user is a member of the channel
            const { data: membership, error: membershipError } = await supabase
                .from('channel_members')
                .select('role')
                .eq('channel_id', channelId)
                .eq('user_id', currentUser.id)
                .single();

            if (membershipError || !membership) {
                console.error('Cannot send message: User is not a member of this channel', membershipError);
                return;
            }

            let messageData = {
                channel_id: channelId,
                user_id: currentUser.id,
                content: message.trim() || currentUpload?.fileName || '',
                type: currentUpload ? 'file' : 'text'
            };

            // Create message
            const { data: messageRecord, error: messageError } = await supabase
                .from('messages')
                .insert([messageData])
                .select<'*', SupabaseMessage>()
                .single();

            if (messageError) {
                console.error('Error creating message:', messageError);
                throw messageError;
            }

            // If we have a file, create the attachment record
            if (currentUpload && messageRecord) {
                const { error: attachmentError } = await supabase
                    .from('attachments')
                    .insert([{
                        message_id: messageRecord.id,
                        file_url: currentUpload.url,
                        file_type: currentUpload.fileType,
                        file_name: currentUpload.fileName,
                        file_size: currentUpload.fileSize
                    }]);

                if (attachmentError) {
                    console.error('Error creating attachment:', attachmentError);
                    throw attachmentError;
                }
                setCurrentUpload(null); // Clear the upload only after successful send
            }

            setMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessage(e.target.value);
        
        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set typing status to true
        setTyping(channelId, true);

        // Set timeout to clear typing status after 2 seconds of no input
        typingTimeoutRef.current = setTimeout(() => {
            setTyping(channelId, false);
        }, 2000);
    };

    // Clear typing status when component unmounts
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            setTyping(channelId, false);
        };
    }, []);

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
        <Box sx={{
            p: 2,
            borderTop: 1,
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
        }}>
            {currentUpload && (
                <Box sx={{ mb: 1 }}>
                    <FilePreview
                        fileUrl={currentUpload.url || ''}
                        fileName={currentUpload.fileName}
                        fileType={currentUpload.fileType}
                        fileSize={currentUpload.fileSize}
                        isUploading={isUploading}
                        uploadProgress={uploadProgress}
                        onRemove={() => setCurrentUpload(null)}
                    />
                </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                />
                <IconButton
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                    <AttachFileIcon />
                </IconButton>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message..."
                    value={message}
                    onChange={handleMessageChange}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    disabled={isUploading}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={handleSendMessage}
                                    disabled={isUploading || (!message.trim() && !currentUpload)}
                                >
                                    <SendIcon />
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                />
            </Box>
        </Box>
    );
};

export default MessageInput; 