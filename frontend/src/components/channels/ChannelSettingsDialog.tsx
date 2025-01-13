import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Box,
    Typography,
    Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

interface ChannelSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    channelId: string;
    channelName: string;
}

const ChannelSettingsDialog: React.FC<ChannelSettingsDialogProps> = ({ 
    open, 
    onClose, 
    channelId,
    channelName
}) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const navigate = useNavigate();

    const handleDeleteClick = () => {
        setShowConfirmation(true);
    };

    const handleCancelDelete = () => {
        setShowConfirmation(false);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('channels')
                .delete()
                .eq('id', channelId);

            if (error) throw error;
            onClose();
            navigate('/channels');
        } catch (error) {
            console.error('Error deleting channel:', error);
        } finally {
            setIsDeleting(false);
            setShowConfirmation(false);
        }
    };

    return (
        <>
            <Dialog 
                open={open} 
                onClose={onClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Channel Settings - {channelName}</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Divider sx={{ my: 3 }} />
                        
                        <Typography 
                            variant="subtitle1" 
                            sx={{ 
                                color: 'error.main',
                                fontWeight: 'bold',
                                mb: 2
                            }}
                        >
                            Danger Zone
                        </Typography>
                        
                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleDeleteClick}
                            disabled={isDeleting}
                            fullWidth
                        >
                            Delete Channel
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={showConfirmation}
                onClose={handleCancelDelete}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Delete Channel?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete <strong>{channelName}</strong>? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelDelete}>Cancel</Button>
                    <Button 
                        onClick={handleConfirmDelete} 
                        color="error" 
                        variant="contained"
                        disabled={isDeleting}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ChannelSettingsDialog; 