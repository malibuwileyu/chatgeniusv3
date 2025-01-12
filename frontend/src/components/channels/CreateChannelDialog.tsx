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

interface CreateChannelDialogProps {
    open: boolean;
    onClose: () => void;
}

const CreateChannelDialog: React.FC<CreateChannelDialogProps> = ({ open, onClose }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'public' | 'private'>('public');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim() || (type === 'private' && !password.trim())) return;
        
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('channels')
                .insert({
                    name: name.trim(),
                    type,
                    description: type === 'private' ? password : null
                });

            if (error) throw error;
            onClose();
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