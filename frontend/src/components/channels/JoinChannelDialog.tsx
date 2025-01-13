import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, TextField } from '@mui/material';
import TagIcon from '@mui/icons-material/Tag';
import LockIcon from '@mui/icons-material/Lock';
import GroupIcon from '@mui/icons-material/Group';

interface JoinChannelDialogProps {
    open: boolean;
    onClose: () => void;
    channel: {
        id: string;
        name: string;
        type: string;
        description: string | null;
        member_count: number;
    } | null;
    onJoin: (channelId: string, password?: string) => Promise<boolean>;
}

const JoinChannelDialog = ({ open, onClose, channel, onJoin }: JoinChannelDialogProps) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    if (!channel) return null;

    const handleJoin = async () => {
        if (channel.type === 'private' && !password) {
            setError('Password is required for private channels');
            return;
        }
        
        setIsJoining(true);
        setError('');
        
        try {
            const success = await onJoin(channel.id, password);
            if (success) {
                setPassword('');
                setError('');
                onClose();
            } else {
                setError('Incorrect password');
            }
        } catch (err) {
            setError('Failed to join channel');
        } finally {
            setIsJoining(false);
        }
    };

    const handleClose = () => {
        setPassword('');
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {channel.type === 'private' ? <LockIcon /> : <TagIcon />}
                {channel.name}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" gutterBottom>
                        {channel.description || 'No description available'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, color: 'text.secondary' }}>
                        <GroupIcon fontSize="small" />
                        <Typography variant="body2">
                            {channel.member_count} {channel.member_count === 1 ? 'member' : 'members'}
                        </Typography>
                    </Box>
                    {channel.type === 'private' && (
                        <TextField
                            fullWidth
                            type="password"
                            label="Channel Password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            error={!!error}
                            helperText={error}
                            sx={{ mt: 2 }}
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button 
                    variant="contained" 
                    onClick={handleJoin}
                    disabled={isJoining}
                >
                    {isJoining ? 'Joining...' : 'Join Channel'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default JoinChannelDialog; 