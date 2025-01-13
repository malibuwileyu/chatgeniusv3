import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    RadioGroup,
    FormControlLabel,
    Radio,
    FormControl,
    FormLabel,
    Box
} from '@mui/material';
import { supabase } from '../../services/supabase';
import { useAppSelector } from '../../store/hooks';
import { RootState } from '../../store/store';

interface CreateChannelDialogProps {
    open: boolean;
    onClose: () => void;
}

const CreateChannelDialog: React.FC<CreateChannelDialogProps> = ({ open, onClose }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'public' | 'private'>('public');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    const handleSubmit = async () => {
        if (!name.trim() || (type === 'private' && !password.trim()) || !currentUser) return;
        
        setIsSubmitting(true);
        try {
            // Create the channel
            const { data: channel, error: channelError } = await supabase
                .from('channels')
                .insert({
                    name: name.trim(),
                    type,
                    description: type === 'private' ? password : null,
                    created_by: currentUser.id
                })
                .select()
                .single();

            if (channelError) throw channelError;

            // Add the creator as a member with admin role
            const { error: memberError } = await supabase
                .from('channel_members')
                .insert({
                    channel_id: channel.id,
                    user_id: currentUser.id,
                    role: 'admin'
                });

            if (memberError) throw memberError;

            onClose();
            setName('');
            setType('public');
            setPassword('');
        } catch (error) {
            console.error('Error creating channel:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setName('');
        setType('public');
        setPassword('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Create New Channel</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        autoFocus
                        label="Channel Name"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <FormControl>
                        <FormLabel>Channel Type</FormLabel>
                        <RadioGroup
                            value={type}
                            onChange={(e) => setType(e.target.value as 'public' | 'private')}
                        >
                            <FormControlLabel value="public" control={<Radio />} label="Public" />
                            <FormControlLabel value="private" control={<Radio />} label="Private" />
                        </RadioGroup>
                    </FormControl>
                    {type === 'private' && (
                        <TextField
                            label="Password"
                            type="password"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button 
                    onClick={handleSubmit}
                    disabled={!name.trim() || (type === 'private' && !password.trim()) || isSubmitting}
                    variant="contained"
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateChannelDialog; 